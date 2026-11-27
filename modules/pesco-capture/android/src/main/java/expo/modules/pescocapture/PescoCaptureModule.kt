package expo.modules.pescocapture

import android.content.Context
import android.provider.Telephony
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PescoCaptureModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  override fun definition() = ModuleDefinition {
    Name("PescoCapture")
    Events("onQueued")

    OnCreate { active = this@PescoCaptureModule }
    OnDestroy { if (active === this@PescoCaptureModule) active = null }

    Function("platformMode") { "sms" }

    /** Messages captured since the last call (also while PESCO was closed). */
    Function("drainQueue") { CaptureQueue.drain(context) }

    /**
     * One-time import of recent bank alerts already in the inbox. Requires
     * READ_SMS, which the app requests in JavaScript after its disclosure screen.
     */
    AsyncFunction("readInbox") { sinceMs: Double, limit: Int ->
      val results = ArrayList<Map<String, Any>>()
      val cursor = context.contentResolver.query(
        Telephony.Sms.Inbox.CONTENT_URI,
        arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
        "${Telephony.Sms.DATE} > ?",
        arrayOf(sinceMs.toLong().toString()),
        "${Telephony.Sms.DATE} DESC"
      )
      cursor?.use {
        val addressIndex = it.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
        val bodyIndex = it.getColumnIndexOrThrow(Telephony.Sms.BODY)
        val dateIndex = it.getColumnIndexOrThrow(Telephony.Sms.DATE)
        while (it.moveToNext() && results.size < limit) {
          val sender = it.getString(addressIndex)
          val body = it.getString(bodyIndex)
          if (!CaptureFilter.isCandidate(sender, body)) continue
          results.add(mapOf(
            "sender" to sender,
            "body" to body,
            "receivedAt" to it.getLong(dateIndex).toDouble(),
            "source" to "sms"
          ))
        }
      }
      results
    }
  }

  companion object {
    @Volatile private var active: PescoCaptureModule? = null

    /** Tells a running app that new messages are waiting; harmless if the app is closed. */
    fun notifyQueued() {
      try { active?.sendEvent("onQueued", mapOf<String, Any>()) } catch (e: Exception) { }
    }
  }
}
