-- Regression tests for account deletion, leaving a household, delete policy,
-- anonymous joins and recurring dates. Any failed check aborts with an error.
\set ON_ERROR_STOP 1
create schema tests;
grant usage on schema tests to authenticated;
create function tests.check(ok boolean, message text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'TEST FAILED: %', message; end if; end $$;
create function tests.expect_error(statement text, pattern text) returns void language plpgsql as $$
begin
 execute statement;
 raise exception 'TEST FAILED: expected error matching "%" from: %', pattern, statement;
exception when others then
 if sqlerrm like 'TEST FAILED:%' or sqlerrm !~* pattern then raise; end if;
end $$;
create function tests.login(who uuid, anonymous boolean default false) returns void language sql as $$
 select set_config('request.jwt.claim.sub',who::text,false),
        set_config('request.jwt.claim.role','authenticated',false),
        set_config('request.jwt.claims',json_build_object('sub',who,'is_anonymous',anonymous)::text,false);
$$;
grant execute on all functions in schema tests to authenticated;

-- Users: A creates, B joins. C and D form a second household.
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b'),
 ('00000000-0000-0000-0000-00000000000c'),('00000000-0000-0000-0000-00000000000d'),
 ('00000000-0000-0000-0000-00000000000e');

create function tests.pair(creator uuid, partner uuid) returns uuid language plpgsql as $$
declare hh uuid; joining_key text;
begin
 perform tests.login(creator);
 hh := public.create_household('Home');
 joining_key := public.issue_household_invite(hh);
 perform tests.login(partner);
 perform tests.check(public.join_household_with_key(joining_key)=hh, 'partner joins with key');
 return hh;
end $$;

\echo '--- account deletion: partner who joined with a key'
select tests.pair('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b') as hh1 \gset
select public.prepare_account_deletion('00000000-0000-0000-0000-00000000000b');
select tests.check((select count(*) from public.household_members where household_id=:'hh1')=1, 'partner membership removed');
select tests.check(not exists(select 1 from public.household_invitations where accepted_by='00000000-0000-0000-0000-00000000000b'), 'accepted invitation removed');

\echo '--- account deletion: creator with a partner'
select tests.pair('00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000d') as hh2 \gset
select public.prepare_account_deletion('00000000-0000-0000-0000-00000000000c');
select tests.check((select created_by from public.households where id=:'hh2')='00000000-0000-0000-0000-00000000000d', 'ownership passed to partner');
select tests.check((select count(*) from public.categories where household_id=:'hh2')=8, 'shared categories kept');

\echo '--- account deletion: only the service role may call it'
set role authenticated;
select tests.login('00000000-0000-0000-0000-00000000000d');
select tests.expect_error($$select public.prepare_account_deletion('00000000-0000-0000-0000-00000000000d')$$, 'permission denied');
reset role;

\echo '--- leave household: last member cannot leave'
set role authenticated;
select tests.login('00000000-0000-0000-0000-00000000000a');
select tests.expect_error('select public.leave_household()', 'only member');
reset role;

\echo '--- leave household: creator leaves, partner becomes owner'
select tests.login('00000000-0000-0000-0000-00000000000a');
select public.issue_household_invite(:'hh1') as key3 \gset
select tests.login('00000000-0000-0000-0000-00000000000e');
select public.join_household_with_key(:'key3');
set role authenticated;
insert into public.expenses(owner_id,household_id,scope,amount_paise,category,spent_on)
 values('00000000-0000-0000-0000-00000000000e',:'hh1','household',5000,'Groceries','2026-11-01') returning id as e_expense \gset
select tests.login('00000000-0000-0000-0000-00000000000a');
select public.leave_household();
reset role;
select tests.check((select created_by from public.households where id=:'hh1')='00000000-0000-0000-0000-00000000000e', 'ownership passed on leave');
select tests.check(not exists(select 1 from public.household_members where user_id='00000000-0000-0000-0000-00000000000a'), 'creator left');

\echo '--- removed member cannot delete household expenses'
-- E owns an expense in the household, then leaves; E must no longer be able to delete it.
select tests.login('00000000-0000-0000-0000-00000000000e');
select public.issue_household_invite(:'hh1') as key4 \gset
select tests.login('00000000-0000-0000-0000-00000000000a');
select public.join_household_with_key(:'key4');
set role authenticated;
select tests.login('00000000-0000-0000-0000-00000000000e');
select public.leave_household();
delete from public.expenses where id=:'e_expense';
reset role;
select tests.check(exists(select 1 from public.expenses where id=:'e_expense'), 'former member delete was blocked');

\echo '--- anonymous sessions cannot use joining keys'
select tests.login('00000000-0000-0000-0000-00000000000a');
select public.issue_household_invite(:'hh1') as key5 \gset
set role authenticated;
select tests.login('00000000-0000-0000-0000-00000000000e', true);
select tests.expect_error(format('select public.join_household_with_key(%L)', :'key5'), 'Sign in with Google or Apple');
reset role;

\echo '--- recurring generation honours the local date within one day of UTC'
select tests.login('00000000-0000-0000-0000-00000000000a');
insert into public.household_recurring_rules(household_id,created_by,amount_paise,category,day_of_month,starts_on)
 values(:'hh1','00000000-0000-0000-0000-00000000000a',1000,'Bills',extract(day from current_date+1)::int,current_date+1);
select tests.check(public.generate_household_recurring(:'hh1')=0, 'nothing due on UTC date');
select tests.check(public.generate_household_recurring(:'hh1',current_date+1)=1, 'due on local date');
select tests.check(public.generate_household_recurring(:'hh1',current_date+5)=0, 'far-off client date ignored');

\echo 'ALL DATABASE TESTS PASSED'
