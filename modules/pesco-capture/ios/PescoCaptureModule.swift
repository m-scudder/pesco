import ExpoModulesCore

/// Hands messages that the "Log Bank Message in PESCO" Shortcuts action stored
/// (see ios-app/LogBankMessageIntent.swift) over to the JavaScript app.
public class PescoCaptureModule: Module {
  static let queueKey = "pesco.capture.queue"

  public func definition() -> ModuleDefinition {
    Name("PescoCapture")
    Events("onQueued")

    Function("platformMode") { () -> String in
      return "shortcut"
    }

    Function("drainQueue") { () -> [[String: Any]] in
      let defaults = UserDefaults.standard
      let items = defaults.array(forKey: PescoCaptureModule.queueKey) as? [[String: Any]] ?? []
      defaults.removeObject(forKey: PescoCaptureModule.queueKey)
      return items
    }
  }
}
