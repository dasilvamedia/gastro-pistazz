import Foundation
import Capacitor
import SafariServices

/// Externe Webseiten IN der App oeffnen (SFSafariViewController als Sheet)
/// statt in den externen Safari zu springen - die Nutzer bleiben immer in
/// der App und sind mit einem Wisch/Fertig-Tap zurueck.
@objc(InAppBrowserPlugin)
public class InAppBrowserPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InAppBrowserPlugin"
    public let jsName = "InAppBrowser"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise),
    ]

    @objc func open(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString),
              ["http", "https"].contains(url.scheme?.lowercased() ?? "") else {
            call.reject("Ungueltige URL")
            return
        }
        DispatchQueue.main.async { [weak self] in
            guard let vc = self?.bridge?.viewController else { call.reject("Kein ViewController"); return }
            let safari = SFSafariViewController(url: url)
            safari.preferredControlTintColor = UIColor(red: 0.427, green: 0.580, blue: 0.314, alpha: 1) // Pistazz
            safari.dismissButtonStyle = .close
            vc.present(safari, animated: true)
            call.resolve(["ok": true])
        }
    }
}
