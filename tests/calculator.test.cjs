const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const file=path.join(__dirname,'../src/lib/calculator.ts');
const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const mod=new Module(file,module);
mod.filename=file;mod.paths=module.paths;mod._compile(code,file);
const {initialCalculator,pressCalculator,calculatorExpression,calculate}=mod.exports;
const enter=(keys,starting='')=>keys.reduce((s,k)=>pressCalculator(s,k),initialCalculator(starting));

test('0.78 × 100 stays visible as an expression and equals 78',()=>{
 const partial=enter(['0','.','7','8','×','1','0']);
 assert.equal(calculatorExpression(partial),'0.78 × 10');
 assert.equal(calculate(partial.accumulator,Math.round(Number(partial.display)*100),partial.operator),780);
 const ready=pressCalculator(partial,'0');
 assert.equal(calculatorExpression(ready),'0.78 × 100');
 const complete=pressCalculator(ready,'=');
 assert.equal(calculatorExpression(complete),'78');
 assert.equal(complete.display,'78');
});
test('one decimal separator per operand',()=>{
 const s=enter(['1','.','2','.','3','×','4','.','.','5']);
 assert.equal(calculatorExpression(s),'1.23 × 4.5');
});
test('existing amounts append until cleared',()=>{
 assert.equal(enter(['2'],'500').display,'5002');
 assert.equal(enter(['C','2'],'500').display,'2');
});
test('subtraction, percent and division',()=>{
 assert.equal(enter(['5','0','−','2','0','=']).display,'30');
 assert.equal(enter(['2','0','0','×','1','0','%','=']).display,'20');
 assert.equal(enter(['8','0','÷','2','=']).display,'40');
});
test('operations cannot start at zero',()=>{
 assert.equal(calculatorExpression(enter(['-','1','2','4'])),'124');
});
