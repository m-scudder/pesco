# Categories (household-first branch)

- Settings → Categories → Household / Personal.
- Eight initial editable presets: Groceries, Food & Drinks, Transport, Bills, Shopping, Health, Entertainment, Other.
- Add, rename or remove categories. Names are unique case-insensitively per scope and limited to 40 characters.
- Household categories are in Supabase, protected by household-member RLS and broadcast over Realtime to both devices.
- Personal categories are local to that device; there is no cloud Personal category synchronization yet.
- Both members can edit Household categories. Membership does not expose Personal categories.
- Expense editor choices and Expenses filters use the configured categories. Historical category names remain searchable/filterable even if removed.
- **Historical behavior:** expenses store category text. Renaming or removing a category changes future selection only and does not modify transactions already recorded.
- Migration applied to PESCO project: `household_categories` and `categories_realtime`. Eight shared presets verified for the existing household.
- Test with two members: add Household category on A → appears on B, rename on B → updates A's selection, remove → absent from new-entry selector on both. Check Personal categories stay private. Verify existing expenses retain original category label.
- Do not use `supabase db push` until manually applied six-character-code migration history is reconciled.
- Full app typecheck and device testing are pending locally.
