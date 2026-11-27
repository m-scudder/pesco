package expo.modules.pescocapture

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Small on-device queue of candidate messages, kept until PESCO next opens.
 * Stored in private app preferences; capped so it can never grow unbounded.
 */
object CaptureQueue {
  private const val PREFS = "pesco_capture"
  private const val KEY = "queue"
  private const val MAX_ITEMS = 300

  @Synchronized
  fun append(context: Context, sender: String, body: String, receivedAt: Long, source: String) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val queue = try { JSONArray(prefs.getString(KEY, "[]")) } catch (e: Exception) { JSONArray() }
    queue.put(JSONObject().apply {
      put("sender", sender)
      put("body", body)
      put("receivedAt", receivedAt)
      put("source", source)
    })
    val trimmed = JSONArray()
    val start = maxOf(0, queue.length() - MAX_ITEMS)
    for (i in start until queue.length()) trimmed.put(queue.get(i))
    prefs.edit().putString(KEY, trimmed.toString()).apply()
  }

  /** Returns every queued message and empties the queue. */
  @Synchronized
  fun drain(context: Context): List<Map<String, Any>> {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val queue = try { JSONArray(prefs.getString(KEY, "[]")) } catch (e: Exception) { JSONArray() }
    prefs.edit().putString(KEY, "[]").commit()
    val items = ArrayList<Map<String, Any>>(queue.length())
    for (i in 0 until queue.length()) {
      val item = queue.optJSONObject(i) ?: continue
      items.add(mapOf(
        "sender" to item.optString("sender"),
        "body" to item.optString("body"),
        "receivedAt" to item.optLong("receivedAt").toDouble(),
        "source" to item.optString("source", "sms")
      ))
    }
    return items
  }
}
