// Reads Indian bank, card and UPI alert messages (SMS or text passed in from an
// iPhone Shortcut) and turns them into a structured transaction. Pure functions
// only: no storage, no network, so it can be unit-tested and run on the device.

export type TransactionDirection='debit'|'credit';
export type TransactionChannel='upi'|'card'|'atm'|'netbanking'|'other';
export type ParsedTransaction={
 amountPaise:number;
 direction:TransactionDirection;
 merchant:string|null;
 accountLast4:string|null;
 reference:string|null;
 date:string;            // YYYY-MM-DD
 bank:string|null;
 channel:TransactionChannel;
};
export type CaptureSource='sms'|'shortcut'|'paste';
export type RawMessage={body:string;sender?:string|null;receivedAt:number;source:CaptureSource};
export type DetectedStatus='new'|'added'|'dismissed';
export type DetectedTransaction=ParsedTransaction&{
 id:string;fingerprint:string;source:CaptureSource;preview:string;receivedAt:number;status:DetectedStatus;
};

const OTP=/\b(otp|one[\s-]?time[\s-]?password|verification code|security code|do not share|never share)\b/i;
const NOT_A_PAYMENT=/\b(will be debited|to be debited|is due|due on|due date|minimum due|min(?:imum)? amt due|requested money|collect request|has requested|request of|pre-?approved|eligible for|apply now|failed|declined|unsuccessful|could not be processed|mandate (?:created|registered)|e-?mandate|statement (?:for|of|is))\b/i;
const DEBIT=/\b(debited|debit(?:ed)?\s+(?:by|with|for)|spent|paid|sent|withdrawn|withdrawal|purchase|txn of|transaction of|payment of|transferred|dr\.?)\b/i;
const CREDIT=/\b(credited|received|deposited|refund(?:ed)?|reversed|cashback of|cr\.?)\b/i;
const AMOUNT=/(?:rs\.?|inr|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi;
const BALANCE_CONTEXT=/(bal(?:ance)?|avl|available|limit|outstanding|total due)\W*$/i;

const BANKS:[RegExp,string][]=[
 [/HDFC/i,'HDFC Bank'],[/\bSBI|SBIUPI|SBICRD|SBIINB/i,'SBI'],[/ICICI/i,'ICICI Bank'],[/AXIS/i,'Axis Bank'],
 [/KOTAK|KOTAKB/i,'Kotak Bank'],[/YES\s?B|YESBNK/i,'Yes Bank'],[/IDFC/i,'IDFC FIRST Bank'],[/INDUS/i,'IndusInd Bank'],
 [/PNB/i,'PNB'],[/BOB|BARODA/i,'Bank of Baroda'],[/CANARA|CANBNK/i,'Canara Bank'],[/UNION|UBOI/i,'Union Bank'],
 [/FEDERAL|FEDBNK/i,'Federal Bank'],[/AU\s?BANK|AUBANK/i,'AU Bank'],[/PAYTM|PYTM/i,'Paytm'],
 [/AMEX|AMERICAN EXPRESS/i,'American Express'],[/RBL/i,'RBL Bank'],[/IDBI/i,'IDBI Bank'],
];
const MONTHS:Record<string,number>={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12};

/** Indian commercial SMS senders use DLT headers such as "VM-HDFCBK" or "AX-ICICIT-S". */
export function isCommercialSender(sender:string|null|undefined){
 if(!sender)return false;
 return /^[A-Z]{2}-[A-Z0-9]{3,9}(-[A-Z])?$/i.test(sender.trim());
}

function pad(n:number){return String(n).padStart(2,'0')}
function isoDate(d:Date){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function validDate(y:number,m:number,d:number){
 if(y<100)y+=2000;
 if(m<1||m>12||d<1||d>31||y<2000||y>2100)return null;
 const check=new Date(y,m-1,d);
 return check.getMonth()===m-1?y+'-'+pad(m)+'-'+pad(d):null;
}

function findDate(text:string,receivedAt:Date):string{
 let match=text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
 let result:string|null=null;
 if(match)result=validDate(+match[1],+match[2],+match[3]);
 if(!result&&(match=text.match(/\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})\b/)))result=validDate(+match[3],+match[2],+match[1]);
 if(!result&&(match=text.match(/\b(\d{1,2})[-\s]?([A-Za-z]{3,4})[-\s,]*(\d{2,4})\b/))){
  const month=MONTHS[match[2].toLowerCase()];
  if(month)result=validDate(+match[3],month,+match[1]);
 }
 // A date more than a week after the message arrived is a misread; prefer arrival.
 const arrival=isoDate(receivedAt);
 if(!result)return arrival;
 const ahead=(new Date(result+'T00:00:00').getTime()-new Date(arrival+'T00:00:00').getTime())/86400000;
 return ahead>7?arrival:result;
}

function findAmount(text:string):number|null{
 AMOUNT.lastIndex=0;
 let match:RegExpExecArray|null;
 while((match=AMOUNT.exec(text))){
  const before=text.slice(Math.max(0,match.index-24),match.index);
  if(BALANCE_CONTEXT.test(before))continue;
  const [whole,fraction='']=match[1].replace(/,/g,'').split('.');
  const paise=Number(whole)*100+Number(fraction.padEnd(2,'0').slice(0,2));
  if(Number.isSafeInteger(paise)&&paise>0)return paise;
 }
 return null;
}

function findLast4(text:string){
 const match=text.match(/\b(?:a\/?c|acct|account|card|ac)\b\s*(?:no\.?|number)?\s*(?:ending\s*(?:with|in)?\s*)?[:\s]*[xX*#.]*(\d{3,4})\b/i);
 return match?match[1].slice(-4):null;
}

function findReference(text:string){
 const match=text.match(/\b(?:upi\s*ref(?:\s*no)?|ref(?:erence)?(?:\s*(?:no|number|id))?|rrn|utr|txn\s*(?:id|no)|imps\s*ref)\b[.:\s#-]*([A-Za-z0-9]{6,})/i);
 return match?match[1]:null;
}

function cleanMerchant(raw:string){
 let name=raw.trim().replace(/\s+/g,' ').replace(/[.,;:-]+$/,'');
 // A UPI handle like "swiggy.stores@axb" reads better as "swiggy.stores".
 if(/^[\w.\-]+@[\w]+$/.test(name))name=name.split('@')[0];
 if(!name||name.length<2||/^\d+$/.test(name)||/^(your|a\/c|ac|account|you)$/i.test(name))return null;
 return name.slice(0,48);
}

function findMerchant(text:string,direction:TransactionDirection){
 const stop='(?=\\s+(?:on|ref|refno|upi|via|using|from|avl|bal|at)\\b|[.;,(]|\\s*$)';
 const patterns=direction==='debit'?[
  new RegExp('\\bto\\s+vpa\\s+([\\w.\\-]+@[\\w]+)','i'),
  new RegExp('\\b(?:at|@)\\s+([A-Za-z][A-Za-z0-9 &\'*._\\-]{1,40}?)'+stop,'i'),
  new RegExp('\\b(?:to|towards|trf to|transfer to|paid to)\\s+([A-Za-z0-9][A-Za-z0-9 &\'*._@\\-]{1,40}?)'+stop,'i'),
  new RegExp('\\b(?:for|info:?)\\s+([A-Za-z][A-Za-z0-9 &\'*._\\-]{1,40}?)'+stop,'i'),
 ]:[
  new RegExp('\\b(?:from|by)\\s+vpa\\s+([\\w.\\-]+@[\\w]+)','i'),
  new RegExp('\\b(?:from|by)\\s+([A-Za-z0-9][A-Za-z0-9 &\'*._@\\-]{1,40}?)'+stop,'i'),
 ];
 for(const pattern of patterns){
  const match=text.match(pattern);
  if(match){const name=cleanMerchant(match[1]);if(name&&!/^(a\/c|ac|acct|account|card|your|bank)\b/i.test(name))return name}
 }
 return null;
}

function findBank(text:string,sender?:string|null){
 for(const [pattern,name] of BANKS)if(sender&&pattern.test(sender))return name;
 for(const [pattern,name] of BANKS)if(pattern.test(text))return name;
 return null;
}

function findChannel(text:string):TransactionChannel{
 if(/\b(upi|vpa)\b/i.test(text))return 'upi';
 if(/\b(atm|cash withdrawal|withdrawn)\b/i.test(text))return 'atm';
 if(/\b(credit card|debit card|card\b)/i.test(text))return 'card';
 if(/\b(neft|imps|rtgs|net ?banking)\b/i.test(text))return 'netbanking';
 return 'other';
}

/** Returns null for anything that is not a completed money movement (OTPs,
 * offers, reminders, failed payments, personal chats). */
export function parseBankMessage(body:string,sender?:string|null,receivedAt:Date=new Date()):ParsedTransaction|null{
 const text=(body||'').replace(/\s+/g,' ').trim();
 if(text.length<12||text.length>1200)return null;
 if(OTP.test(text)||NOT_A_PAYMENT.test(text))return null;
 const amountPaise=findAmount(text);
 if(amountPaise===null)return null;
 const debitAt=text.search(DEBIT),creditAt=text.search(CREDIT);
 if(debitAt<0&&creditAt<0)return null;
 const direction:TransactionDirection=creditAt<0||(debitAt>=0&&debitAt<creditAt)?'debit':'credit';
 return {
  amountPaise,direction,
  merchant:findMerchant(text,direction),
  accountLast4:findLast4(text),
  reference:findReference(text),
  date:findDate(text,receivedAt),
  bank:findBank(text,sender),
  channel:findChannel(text),
 };
}

/** Same payment often arrives twice (SMS + bank app, or a re-imported inbox).
 * The bank reference is the strongest key; otherwise amount, day, account and merchant. */
export function transactionFingerprint(t:ParsedTransaction){
 if(t.reference)return 'ref:'+t.reference.toUpperCase();
 return ['tx',t.direction,t.amountPaise,t.date,t.accountLast4??'',(t.merchant??'').toLowerCase()].join(':');
}

/** Short, masked text so the user can see what was detected without keeping
 * full account numbers on the device. */
export function maskedPreview(body:string){
 return body.replace(/\s+/g,' ').trim().replace(/\d{5,}/g,m=>'•'.repeat(m.length-4)+m.slice(-4)).slice(0,220);
}

/** Merge new messages into the detected list. Debits only: PESCO records spending.
 * Fingerprints of added or dismissed items are kept, so a re-scan never brings them back. */
export function mergeDetected(existing:DetectedTransaction[],messages:RawMessage[],makeId:()=>string,keep=400){
 const known=new Set(existing.map(item=>item.fingerprint));
 const added:DetectedTransaction[]=[];
 for(const message of messages){
  const parsed=parseBankMessage(message.body,message.sender,new Date(message.receivedAt));
  if(!parsed||parsed.direction!=='debit')continue;
  const fingerprint=transactionFingerprint(parsed);
  if(known.has(fingerprint))continue;
  known.add(fingerprint);
  added.push({...parsed,id:makeId(),fingerprint,source:message.source,preview:maskedPreview(message.body),receivedAt:message.receivedAt,status:'new'});
 }
 const all=[...added,...existing].sort((a,b)=>b.receivedAt-a.receivedAt).slice(0,keep);
 return {all,added:added.length};
}
