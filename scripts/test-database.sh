#!/usr/bin/env bash
# Applies every migration to a throwaway PostgreSQL database and runs the SQL tests.
# Uses the standard PG* environment variables (PGHOST, PGUSER, PGPASSWORD, ...).
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${PESCO_TEST_DB:-pesco_test}"
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f supabase/tests/00_supabase_stubs.sql
for migration in supabase/migrations/*.sql; do
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$migration" >/dev/null
done
for test in supabase/tests/*.test.sql; do
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$test"
done
