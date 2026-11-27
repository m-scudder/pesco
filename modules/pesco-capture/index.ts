import {Platform} from 'react-native';
import {requireOptionalNativeModule} from 'expo';
import type {RawMessage} from '../../src/lib/transactionParser';

type NativeCapture={
 platformMode():'sms'|'shortcut';
 drainQueue():RawMessage[];
 readInbox?(sinceMs:number,limit:number):Promise<RawMessage[]>;
 addListener(event:'onQueued',listener:()=>void):{remove():void};
};

// Null in Expo Go, on the web, or before a native rebuild: callers fall back to
// manual entry and pasted messages.
const native=Platform.OS==='web'?null:requireOptionalNativeModule<NativeCapture>('PescoCapture');

export const captureAvailable=!!native;
export const captureMode:'sms'|'shortcut'|null=native?native.platformMode():null;

export function drainQueue():RawMessage[]{
 if(!native)return [];
 try{return native.drainQueue()}catch(error){console.warn('Capture queue unavailable',error);return []}
}

export async function readInbox(sinceMs:number,limit=500):Promise<RawMessage[]>{
 if(!native?.readInbox)return [];
 return native.readInbox(sinceMs,limit);
}

export function onQueued(listener:()=>void):()=>void{
 if(!native)return ()=>{};
 const subscription=native.addListener('onQueued',listener);
 return ()=>subscription.remove();
}
