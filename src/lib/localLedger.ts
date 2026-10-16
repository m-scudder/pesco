import * as SQLite from 'expo-sqlite';
import type {Expense} from '@/data';

let database:Promise<SQLite.SQLiteDatabase>|null=null;
async function db(){
 if(!database)database=(async()=>{
  const connection=await SQLite.openDatabaseAsync('pesco-ledger.db');
  await connection.execAsync(`PRAGMA journal_mode = WAL;
   CREATE TABLE IF NOT EXISTS expense_ledger (
    user_id TEXT NOT NULL,
    expense_id TEXT NOT NULL,
    household_id TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY(user_id,expense_id)
   );
   CREATE INDEX IF NOT EXISTS expense_ledger_household ON expense_ledger(user_id,household_id);`);
  return connection;
 })().catch(error=>{database=null;throw error});
 return database;
}
export async function loadHouseholdLedger(userId:string,householdId:string):Promise<Expense[]>{
 const rows=await (await db()).getAllAsync<{data:string}>(
  'SELECT data FROM expense_ledger WHERE user_id = ? AND household_id = ?',
  userId,householdId);
 return rows.map(row=>JSON.parse(row.data) as Expense);
}
export async function mergeHouseholdLedger(userId:string,householdId:string,expenses:Expense[]):Promise<void>{
 const connection=await db();
 await connection.withTransactionAsync(async()=>{
  for(const expense of expenses){
   await connection.runAsync(
    'INSERT INTO expense_ledger(user_id,expense_id,household_id,data,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,expense_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at,household_id=excluded.household_id',
    userId,expense.id,householdId,JSON.stringify(expense),expense.updatedAt);
  }
 });
}
export async function removeHouseholdLedgerExpense(userId:string,id:string):Promise<void>{
 await (await db()).runAsync('DELETE FROM expense_ledger WHERE user_id=? AND expense_id=?',userId,id);
}
