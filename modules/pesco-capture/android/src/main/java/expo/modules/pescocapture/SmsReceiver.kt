package expo.modules.pescocapture

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony

/** Receives every incoming SMS from the system, keeps only bank/UPI alerts. */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    // A long message arrives in several parts; join them per sender.
    val bodies = LinkedHashMap<String, StringBuilder>()
    var receivedAt = System.currentTimeMillis()
    for (part in parts) {
      if (part == null) continue
      val sender = part.displayOriginatingAddress ?: part.originatingAddress ?: continue
      bodies.getOrPut(sender) { StringBuilder() }.append(part.displayMessageBody ?: part.messageBody ?: "")
      if (part.timestampMillis > 0) receivedAt = part.timestampMillis
    }
    var queued = false
    for ((sender, body) in bodies) {
      val text = body.toString()
      if (!CaptureFilter.isCandidate(sender, text)) continue
      CaptureQueue.append(context.applicationContext, sender, text, receivedAt, "sms")
      queued = true
    }
    if (queued) PescoCaptureModule.notifyQueued()
  }
}
