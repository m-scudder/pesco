import AppIntents
import Foundation

// Added to the PESCO app target by plugins/withPescoCaptureIntent.cjs.
// App Intents must live in the app itself to appear in the Shortcuts app.
// iOS gives apps no SMS access; the user's one-time Message automation passes
// each matching text here. Only likely bank/UPI alerts are kept, on the device.

@available(iOS 16.0, *)
struct LogBankMessageIntent: AppIntent {
  static var title: LocalizedStringResource = "Log Bank Message in PESCO"
  static var description = IntentDescription(
    "Sends a bank or UPI text message to PESCO so the payment can be added to your expenses."
  )
  static var openAppWhenRun: Bool = false

  @Parameter(title: "Message", inputConnectionBehavior: .connectToPreviousIntentResult)
  var message: String

  func perform() async throws -> some IntentResult {
    PescoCaptureStore.append(body: message)
    return .result()
  }
}

enum PescoCaptureStore {
  static let queueKey = "pesco.capture.queue"
  static let maxItems = 300

  private static let amount = try! NSRegularExpression(pattern: "(rs\\.?|inr|₹)\\s*[0-9]", options: .caseInsensitive)
  private static let movement = try! NSRegularExpression(
    pattern: "\\b(debited|credited|spent|paid|sent|withdrawn|purchase|txn|transaction|transferred|received|refund)",
    options: .caseInsensitive)
  private static let otp = try! NSRegularExpression(
    pattern: "\\b(otp|one[\\s-]?time[\\s-]?password|verification code|do not share|never share)\\b",
    options: .caseInsensitive)

  private static func matches(_ regex: NSRegularExpression, _ text: String) -> Bool {
    regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) != nil
  }

  /// Same privacy filter as Android: personal chats and OTPs are never stored.
  static func isCandidate(_ body: String) -> Bool {
    if body.count > 1200 || matches(otp, body) { return false }
    return matches(amount, body) && matches(movement, body)
  }

  static func append(body: String) {
    let text = body.trimmingCharacters(in: .whitespacesAndNewlines)
    guard isCandidate(text) else { return }
    let defaults = UserDefaults.standard
    var queue = defaults.array(forKey: queueKey) as? [[String: Any]] ?? []
    queue.append([
      "sender": "",
      "body": text,
      "receivedAt": Date().timeIntervalSince1970 * 1000,
      "source": "shortcut",
    ])
    if queue.count > maxItems { queue.removeFirst(queue.count - maxItems) }
    defaults.set(queue, forKey: queueKey)
  }
}
