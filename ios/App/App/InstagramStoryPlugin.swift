import Foundation
import Capacitor
import UIKit

/// Uebergibt das Story-Bild direkt an Instagram (Meta "Sharing to Stories").
/// Das Bild landet automatisch als Story-Hintergrund. Der Nutzer muss nur noch
/// Tags/Sticker setzen und auf Teilen tippen.
@objc(InstagramStoryPlugin)
public class InstagramStoryPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InstagramStoryPlugin"
    public let jsName = "InstagramStory"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareVideo", returnType: CAPPluginReturnPromise)
    ]

    /// Uebergibt ein aufgenommenes Video (Story/Boomerang) direkt an
    /// Instagram als Story-Hintergrundvideo. Optional legt stickerBase64
    /// (transparentes PNG in Story-Groesse) den powered-by-Sticker als
    /// eigenes Instagram-Element darueber - das Video bleibt dann das
    /// unangetastete Original ohne zweiten Encode.
    @objc func shareVideo(_ call: CAPPluginCall) {
        guard let base64 = call.getString("base64"),
              let videoData = Data(base64Encoded: base64) else {
            call.reject("base64 fehlt oder ungueltig")
            return
        }
        let appId = call.getString("appId") ?? ""
        let stickerData = call.getString("stickerBase64").flatMap { Data(base64Encoded: $0) }

        DispatchQueue.main.async {
            guard let url = URL(string: "instagram-stories://share?source_application=\(appId)"),
                  UIApplication.shared.canOpenURL(url) else {
                call.resolve(["shared": false, "reason": "instagram_not_installed"])
                return
            }

            var item: [String: Any] = [
                "com.instagram.sharedSticker.backgroundVideo": videoData,
            ]
            if let stickerData = stickerData {
                item["com.instagram.sharedSticker.stickerImage"] = stickerData
            }
            let items: [[String: Any]] = [item]
            let options: [UIPasteboard.OptionsKey: Any] = [
                .expirationDate: Date().addingTimeInterval(60 * 5),
            ]
            UIPasteboard.general.setItems(items, options: options)

            UIApplication.shared.open(url, options: [:]) { ok in
                call.resolve(["shared": ok])
            }
        }
    }

    @objc func share(_ call: CAPPluginCall) {
        guard let base64 = call.getString("base64"),
              let imageData = Data(base64Encoded: base64) else {
            call.reject("base64 fehlt oder ungueltig")
            return
        }
        let appId = call.getString("appId") ?? ""

        DispatchQueue.main.async {
            guard let url = URL(string: "instagram-stories://share?source_application=\(appId)"),
                  UIApplication.shared.canOpenURL(url) else {
                call.resolve(["shared": false, "reason": "instagram_not_installed"])
                return
            }

            let items: [[String: Any]] = [[
                "com.instagram.sharedSticker.backgroundImage": imageData,
            ]]
            let options: [UIPasteboard.OptionsKey: Any] = [
                .expirationDate: Date().addingTimeInterval(60 * 5),
            ]
            UIPasteboard.general.setItems(items, options: options)

            UIApplication.shared.open(url, options: [:]) { ok in
                call.resolve(["shared": ok])
            }
        }
    }
}
