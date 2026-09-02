import UIKit
import Capacitor

/// Capacitor registriert Plugins, die direkt im App-Target liegen (statt als
/// SPM/npm-Paket), NICHT automatisch - sie muessen hier beim Bridge-Start
/// explizit angemeldet werden. Ohne das existiert window.Capacitor.Plugins.X
/// im WebView schlicht nicht und die Web-App faellt auf ihre Fallbacks
/// zurueck (z.B. Browser-Login statt nativem Sheet).
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeAuthPlugin())
        bridge?.registerPluginInstance(NfcStampPlugin())
        bridge?.registerPluginInstance(InstagramStoryPlugin())
        bridge?.registerPluginInstance(NativeCamPlugin())
        // Vom linken Rand wischen = zurueck, wie in jeder nativen iOS-App
        // (inkl. Slide-Animation der WebView-History)
        bridge?.webView?.allowsBackForwardNavigationGestures = true
    }
}
