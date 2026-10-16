import * as SQLite from 'expo-sqlite';
import type {Expense} from '@/data';

type LedgerRow={data:string};
let database:Promise<SQLite.SQLiteDatabase>|null=null;
async function db():Promise<SQLite.SQLiteDatabase>{
 if(!database)database=(async()=>{
  const connection=await SQLite.openDatabaseAsync('pesco-ledger.db');
  await connection.execAsync(`PRAGMA journal_mode = WAL;
   CREATE TABLE IF NOT EXISTS expense_ledger (
    user_id TEXT NOT NULL,
    expense_id TEXT NOT NULL,
    household_id TEXT NOT NULL,
    data TEXT NOT NULL,
    sync_state TEXT NOT NULL CHECK(sync_state IN ('local','synced')),
    snapshot_id TEXT NOT NULL DEFAULT '',
    PRIMARY KEY(user_id,expense_id)
   );
   CREATE INDEX IF NOT EXISTS ledger_household ON expense_ledger(user_id,household_id);`);
  return connection;
 })().catch(error=>{database=null;throw error});
 return database;
}
export async function loadHouseholdLedger(userId:string,householdId:string):Promise<Expense[]>{
 const rows=await (await db()).getAllAsync<LedgerRow>(
  'SELECT data FROM expense_ledger WHERE user_id=? AND household_id=?',
  userId,householdId);
 return rows.map(row=>JSON.parse(row.data) as Expense);
}
// Used for first-run migration from the existing AsyncStorage cached snapshot.
export async function seedHouseholdLedger(userId:string,householdId:string,rows:Expense[]):Promise<void>{
 const connection=await db();
 await connection.withTransactionAsync(async()=>{
  for(const row of rows){
   await connection.runAsync(
    "INSERT OR IGNORE INTO expense_ledger(user_id,expense_id,household_id,data,sync_state) VALUES(?,?,?,?,'synced')",
    userId,row.id,householdId,JSON.stringify(row));
  }
 });
}
// A locally added row stays in the ledger until a server snapshot includes it.
export async function upsertLocalHouseholdExpense(userId:string,householdId:string,row:Expense):Promise<void>{
 await (await db()).runAsync(
  `INSERT INTO expense_ledger(user_id,expense_id,household_id,data,sync_state)
   VALUES(?,?,?,?,'local')
   ON CONFLICT(user_id,expense_id) DO UPDATE SET data=excluded.data,sync_state='local'`,
  userId,row.id,householdId,JSON.stringify(row));
}
export async function removeHouseholdLedgerExpense(userId:string,id:string):Promise<void>{
 await (await db()).runAsync('DELETE FROM expense_ledger WHERE user_id=? AND expense_id=?',userId,id);
}
// Full remote snapshots replace only server-owned rows. Pending rows are never
// pruned based on an older response; matching IDs are promoted to synced.
export async function reconcileHouseholdLedger(userId:string,householdId:string,rows:Expense[]):Promise<Expense[]>{
 const connection=await db();
 const snapshot=Date.now().toString()+'-'+Math.random().toString(36).slice(2);
 await connection.withTransactionAsync(async()=>{
  for(const row of rows){
   await connection.runAsync(
    `INSERT INTO expense_ledger(user_id,expense_id,household_id,data,sync_state,snapshot_id)
     VALUES(?,?,?,?,'synced',?)
     ON CONFLICT(user_id,expense_id) DO UPDATE SET
     data=excluded.data,sync_state='synced',snapshot_id=excluded.snapshot_id`,
    userId,row.id,householdId,JSON.stringify(row),snapshot);
  }
  await connection.runAsync(
   "DELETE FROM expense_ledger WHERE user_id=? AND household_id=? AND sync_state='synced' AND snapshot_id<>?",
   userId,householdId,snapshot);
 });
 return loadHouseholdLedger(userId,householdId);
}
