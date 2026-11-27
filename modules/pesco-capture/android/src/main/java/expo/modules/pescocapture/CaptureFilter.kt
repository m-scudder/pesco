package expo.modules.pescocapture

/**
 * First-pass privacy filter, run before anything is stored. Only messages from
 * commercial senders (Indian DLT headers such as "VM-HDFCBK") that mention an
 * amount and a money movement are kept. Personal chats and OTPs never leave the
 * system SMS store. Detailed parsing happens later in JavaScript.
 */
object CaptureFilter {
  private val commercialSender = Regex("^[A-Z]{2}-[A-Z0-9]{3,9}(-[A-Z])?$", RegexOption.IGNORE_CASE)
  private val amount = Regex("(rs\\.?|inr|₹)\\s*[0-9]", RegexOption.IGNORE_CASE)
  private val movement = Regex(
    "\\b(debited|credited|spent|paid|sent|withdrawn|purchase|txn|transaction|transferred|received|refund)",
    RegexOption.IGNORE_CASE
  )
  private val otp = Regex(
    "\\b(otp|one[\\s-]?time[\\s-]?password|verification code|do not share|never share)\\b",
    RegexOption.IGNORE_CASE
  )

  fun isCandidate(sender: String?, body: String?): Boolean {
    if (sender == null || body == null) return false
    if (!commercialSender.matches(sender.trim())) return false
    if (body.length > 1200 || otp.containsMatchIn(body)) return false
    return amount.containsMatchIn(body) && movement.containsMatchIn(body)
  }
}
