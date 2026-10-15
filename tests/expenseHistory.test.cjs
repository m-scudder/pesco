const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const file=path.join(__dirname,'../src/lib/expenseHistory.ts');
const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod=new Module(file,module);
mod.filename=file;mod.paths=module.paths;mod._compile(code,file);
const {expensesCsv,filterHistory}=mod.exports;
const create=(overrides={})=>({id:'a',scope:'personal',amountPaise:12345,category:'Groceries',note:'Milk',date:'2026-10-15',ownerId:'owner',createdAt:'2026-10-15T12:00:00Z',updatedAt:'2026-10-15T12:00:00Z',...overrides});

test('history filters by ownership scope, inclusive dates and search',()=>{
 const records=[create(),create({id:'b',scope:'household'}),create({id:'c',date:'2026-10-01',note:'Taxi'}),create({id:'d',date:'2026-09-30'})];
 assert.deepEqual(filterHistory(records,'personal','2026-10-01','2026-10-15','').map(x=>x.id),['a','c']);
 assert.deepEqual(filterHistory(records,'personal','2026-10-01','2026-10-15','taxi').map(x=>x.id),['c']);
 assert.deepEqual(filterHistory(records,'household','2026-10-01','2026-10-15','').map(x=>x.id),['b']);
});

test('CSV exports correctly escaped fields and exact paise',()=>{
 const csv=expensesCsv([create({note:'Milk, "large"\ncarton',amountPaise:107})]);
 assert.ok(csv.startsWith('\uFEFF'));
 assert.ok(csv.includes('"Milk, ""large""\ncarton"'));
 assert.ok(csv.includes('"1.07"'));
 assert.ok(csv.endsWith('\r\n'));
});

test('CSV guards user-supplied spreadsheet formulas',()=>{
 const csv=expensesCsv([create({note:'=HYPERLINK("https://example.invalid")',category:'-SUM(1,1)'})]);
 assert.ok(csv.includes('"\'=HYPERLINK'));
 assert.ok(csv.includes('"\'-SUM'));
});
