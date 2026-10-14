# Insights redesign

Insights uses existing expense data; no database migration is required.

## Display

- Household/Personal scope and month selector at top.
- Total spent, transaction count, previous-month percentage, and remaining/overspent monthly budget.
- Household: contribution totals for You and Partner, using creator IDs from existing shared expenses.
- Six-month trend whenever **any** of the six months has transactions, even if the selected month is empty.
- Category totals with percentage breakdown, sorted by spending.
- Compact empty state; no empty charts or unnecessary descriptive sections.
- Shared-expense list currently returns only the latest 100 rows; show a limitation warning if that limit is reached instead of implying all-time accuracy.
- Household budget is still local to each device; sharing budget settings is a separate feature.

## Validation on both devices

1. Verify that creating, editing, and deleting a shared expense updates Home and Insights on both phones.
2. Switch to Personal: only this phone's records should contribute to Personal totals.
3. Select a month with no transactions and a previous month with spending; trend remains visible and comparison is accurate.
4. Set a monthly budget below spending (overspend) and above spending (remaining).
5. Confirm category sums equal the displayed total and the contributor totals add up to the household total.
6. Test long category names and large INR amounts in light and dark modes.

Full TypeScript and simulator builds must still be run locally.
