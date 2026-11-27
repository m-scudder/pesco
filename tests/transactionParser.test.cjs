const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const file=path.join(__dirname,'../src/lib/transactionParser.ts');
const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const mod=new Module(file,module);
mod.filename=file;mod.paths=module.paths;mod._compile(code,file);
const {parseBankMessage,isCommercialSender,transactionFingerprint,mergeDetected,maskedPreview}=mod.exports;

// Synthetic messages modelled on common Indian bank and UPI alert formats.
// Names, numbers and references are invented.
const received=new Date(2026,10,27,14,30);
const parse=(body,sender)=>parseBankMessage(body,sender,received);

test('UPI debit with VPA',()=>{
 const t=parse('Rs.450.00 debited from A/c XX1234 on 27-11-26 to VPA swiggy.stores@axb (UPI Ref No 633112345678). Not you? Call 18002586161','VM-HDFCBK');
 assert.equal(t.amountPaise,45000);
 assert.equal(t.direction,'debit');
 assert.equal(t.merchant,'swiggy.stores');
 assert.equal(t.accountLast4,'1234');
 assert.equal(t.reference,'633112345678');
 assert.equal(t.date,'2026-11-27');
 assert.equal(t.bank,'HDFC Bank');
 assert.equal(t.channel,'upi');
});

test('"Sent" style UPI message',()=>{
 const t=parse('Sent Rs.1,250.00\nFrom HDFC Bank A/C *5678\nTo RAHUL SHARMA\nOn 26/11/26\nRef 633087654321\nNot You?\nCall 18002586161/SMS BLOCK UPI to 7308080808','AX-HDFCBK-S');
 assert.equal(t.amountPaise,125000);
 assert.equal(t.direction,'debit');
 assert.equal(t.merchant,'RAHUL SHARMA');
 assert.equal(t.accountLast4,'5678');
 assert.equal(t.date,'2026-11-26');
});

test('card spend ignores the available balance amount',()=>{
 const t=parse('INR 2,399.00 spent on ICICI Bank Card XX4321 on 25-Nov-26 at AMAZON PAY IN. Avl Limit: INR 1,45,000.50. If not you, call 1800 2662/SMS BLOCK 4321 to 9215676766','JD-ICICIT');
 assert.equal(t.amountPaise,239900);
 assert.equal(t.merchant,'AMAZON PAY IN');
 assert.equal(t.accountLast4,'4321');
 assert.equal(t.date,'2026-11-25');
 assert.equal(t.channel,'card');
 assert.equal(t.bank,'ICICI Bank');
});

test('SBI UPI debit with "trf to"',()=>{
 const t=parse('Dear UPI user A/C X9876 debited by 89.0 on date 27Nov26 trf to ZEPTO MARKETPLACE Refno 633199887766. If not u? call 1800111109. -SBI','VM-SBIUPI');
 // No currency marker before the amount: not recognised rather than guessed.
 assert.equal(t,null);
 const withRs=parse('Dear UPI user A/C X9876 debited by Rs.89.00 on date 27Nov26 trf to ZEPTO MARKETPLACE Refno 633199887766. If not u? call 1800111109. -SBI','VM-SBIUPI');
 assert.equal(withRs.amountPaise,8900);
 assert.equal(withRs.merchant,'ZEPTO MARKETPLACE');
 assert.equal(withRs.accountLast4,'9876');
 assert.equal(withRs.date,'2026-11-27');
 assert.equal(withRs.bank,'SBI');
});

test('ATM withdrawal',()=>{
 const t=parse('Rs 5000 withdrawn from Kotak Bank a/c XX2468 at ATM on 24-11-2026. Avl bal Rs 12,345.67','BZ-KOTAKB');
 assert.equal(t.amountPaise,500000);
 assert.equal(t.direction,'debit');
 assert.equal(t.channel,'atm');
 assert.equal(t.bank,'Kotak Bank');
});

test('credit is recognised as a credit',()=>{
 const t=parse('Rs.15,000.00 credited to A/c XX1234 on 27-11-26 by VPA priya.k@okaxis (UPI Ref No 633155544433).','VM-HDFCBK');
 assert.equal(t.direction,'credit');
 assert.equal(t.merchant,'priya.k');
});

test('time of day is never taken as a merchant',()=>{
 const t=parse('Rs.120 debited from a/c XX1111 on 27-11-26 at 10:45 PM. UPI Ref 633100011122','VM-AXISBK');
 assert.equal(t.merchant,null);
});

test('non-payments are ignored',()=>{
 const ignored=[
  'Your OTP for transaction of Rs.2,000 at FLIPKART is 482913. Do not share it with anyone.',
  'Rs.3,500 will be debited from your a/c XX1234 on 01-12-26 towards NETFLIX mandate.',
  'Your ICICI Bank Credit Card XX4321 statement: Total due Rs 12,450. Minimum due Rs 620 is due on 05-12-26.',
  'RAHUL SHARMA has requested money from you on Google Pay. Rs 500. Pay now',
  'Congratulations! You are pre-approved for a personal loan of Rs 5,00,000. Apply now.',
  'Txn of Rs 999 at MYNTRA failed due to insufficient balance.',
  'Hey, can you send me Rs 200 for the cab?',
  'Meeting at 5 pm tomorrow',
 ];
 for(const message of ignored)assert.equal(parse(message,'VM-HDFCBK'),null,message);
});

test('commercial sender detection',()=>{
 assert.equal(isCommercialSender('VM-HDFCBK'),true);
 assert.equal(isCommercialSender('AX-ICICIT-S'),true);
 assert.equal(isCommercialSender('+919876543210'),false);
 assert.equal(isCommercialSender('Mom'),false);
 assert.equal(isCommercialSender(null),false);
});

test('far-future dates fall back to the arrival date',()=>{
 const t=parse('Rs.100 debited from A/c XX1234 on 27-11-29 to VPA a@b UPI Ref 633100000001','VM-HDFCBK');
 assert.equal(t.date,'2026-11-27');
});

test('preview masks long numbers',()=>{
 assert.equal(maskedPreview('Ref 633112345678 a/c 1234'),'Ref ••••••••5678 a/c 1234');
});

test('merge keeps debits, removes duplicates and remembers dismissed items',()=>{
 let n=0;const id=()=>'id'+(++n);
 const sms={body:'Rs.450.00 debited from A/c XX1234 on 27-11-26 to VPA swiggy@axb (UPI Ref No 633112345678).',sender:'VM-HDFCBK',receivedAt:received.getTime(),source:'sms'};
 const credit={body:'Rs.15,000.00 credited to A/c XX1234 on 27-11-26 by VPA priya@okaxis (UPI Ref No 633155544433).',sender:'VM-HDFCBK',receivedAt:received.getTime(),source:'sms'};
 const first=mergeDetected([],[sms,sms,credit],id);
 assert.equal(first.added,1);
 assert.equal(first.all[0].status,'new');
 const dismissed=first.all.map(item=>({...item,status:'dismissed'}));
 const again=mergeDetected(dismissed,[{...sms,source:'shortcut'}],id);
 assert.equal(again.added,0);
 assert.equal(again.all.length,1);
 assert.equal(transactionFingerprint(first.all[0]),'ref:633112345678');
});
