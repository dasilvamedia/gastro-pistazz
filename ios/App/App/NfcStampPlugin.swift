import Foundation
import Capacitor
import CoreNFC

/// Liest die UID eines physischen NFC-Tags aus (im Restaurant angebracht) und
/// gibt sie an die Web-App zurueck. Die App ordnet die UID einem registrierten
/// Tag zu und vergibt einen Stempel - kein Foto/Standort noetig, da nur wer
/// physisch am Tag ist ihn ueberhaupt auslesen kann.
@objc(NfcStampPlugin)
public class NfcStampPlugin: CAPPlugin, CAPBridgedPlugin, NFCTagReaderSessionDelegate {
    public let identifier = "NfcStampPlugin"
    public let jsName = "NfcStamp"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?
    private var session: NFCTagReaderSession?

    @objc func scan(_ call: CAPPluginCall) {
        guard NFCTagReaderSession.readingAvailable else {
            call.reject("nfc_not_available")
            return
        }
        pendingCall = call
        session = NFCTagReaderSession(pollingOption: [.iso14443, .iso15693, .iso18092], delegate: self, queue: nil)
        session?.alertMessage = "Halte dein iPhone an den NFC-Tag"
        session?.begin()
    }

    public func tagReaderSessionDidBecomeActive(_ session: NFCTagReaderSession) {}

    public func tagReaderSession(_ session: NFCTagReaderSession, didInvalidateWithError error: Error) {
        let nsError = error as NSError
        // Code 200 = Nutzer hat den System-Dialog selbst abgebrochen, kein echter Fehler
        if nsError.code != 200, let call = pendingCall {
            call.reject("scan_failed", nsError.localizedDescription)
        }
        pendingCall = nil
    }

    public func tagReaderSession(_ session: NFCTagReaderSession, didDetect tags: [NFCTag]) {
        guard let tag = tags.first else { return }

        var uidData: Data?
        switch tag {
        case .miFare(let t): uidData = t.identifier
        case .iso7816(let t): uidData = t.identifier
        case .iso15693(let t): uidData = t.identifier
        case .feliCa(let t): uidData = t.currentIDm
        @unknown default: uidData = nil
        }

        guard let data = uidData, !data.isEmpty else {
            session.invalidate(errorMessage: "Tag konnte nicht gelesen werden")
            return
        }

        let uid = data.map { String(format: "%02X", $0) }.joined()
        session.alertMessage = "Stempel erhalten! ✨"
        session.invalidate()
        pendingCall?.resolve(["uid": uid])
        pendingCall = nil
    }
}
