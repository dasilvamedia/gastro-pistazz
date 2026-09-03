import Foundation
import Capacitor
import AuthenticationServices
import CryptoKit
import GoogleSignIn

/// Vollstaendig nativer Login ohne Browser: Apple ueber ASAuthorization
/// (System-Sheet), Google ueber das GoogleSignIn-SDK (natives Konto-Sheet).
/// Beide liefern ein ID-Token, das die Web-App direkt gegen eine
/// Supabase-Session tauscht (signInWithIdToken) - kein Redirect, kein
/// Safari/Chrome, kein PKCE-Storage-Problem.
@objc(NativeAuthPlugin)
public class NativeAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "NativeAuthPlugin"
    public let jsName = "NativeAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signInWithApple", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signInWithGoogle", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?
    private var currentNonce: String?

    // MARK: - Apple

    @objc func signInWithApple(_ call: CAPPluginCall) {
        pendingCall = call
        let rawNonce = Self.randomNonce()
        currentNonce = rawNonce

        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        // Apple erwartet den SHA256-Hash; das Roh-Nonce geht an Supabase.
        request.nonce = Self.sha256(rawNonce)

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        DispatchQueue.main.async { controller.performRequests() }
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let cred = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = cred.identityToken,
              let token = String(data: tokenData, encoding: .utf8),
              let nonce = currentNonce else {
            pendingCall?.reject("apple_no_token")
            pendingCall = nil
            return
        }
        // Name kommt nur beim allerersten Sign-in mit - direkt mitliefern,
        // getrennt nach Vor-/Nachname fuer die Anrede in der App.
        var fullName = ""
        var givenName = ""
        var familyName = ""
        if let n = cred.fullName {
            givenName = n.givenName ?? ""
            familyName = n.familyName ?? ""
            fullName = [n.givenName, n.familyName].compactMap { $0 }.joined(separator: " ")
        }
        pendingCall?.resolve([
            "identityToken": token,
            "nonce": nonce,
            "fullName": fullName,
            "givenName": givenName,
            "familyName": familyName
        ])
        pendingCall = nil
        currentNonce = nil
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let ns = error as NSError
        if ns.code == ASAuthorizationError.canceled.rawValue {
            pendingCall?.reject("cancelled")
        } else {
            pendingCall?.reject("apple_failed", nil, error)
        }
        pendingCall = nil
        currentNonce = nil
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.bridge?.webView?.window ?? ASPresentationAnchor()
    }

    private static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
        return String((0..<length).map { _ in charset[Int.random(in: 0..<charset.count)] })
    }

    private static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }

    // MARK: - Google

    @objc func signInWithGoogle(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let presenting = self.bridge?.viewController else {
                call.reject("no_view_controller")
                return
            }
            GIDSignIn.sharedInstance.signIn(withPresenting: presenting) { result, error in
                if let error = error as NSError? {
                    if error.code == GIDSignInError.canceled.rawValue {
                        call.reject("cancelled")
                    } else {
                        call.reject("google_failed", nil, error)
                    }
                    return
                }
                guard let idToken = result?.user.idToken?.tokenString else {
                    call.reject("google_no_token")
                    return
                }
                // Profilname mitgeben: Google liefert Vor-/Nachname getrennt
                let profile = result?.user.profile
                call.resolve([
                    "idToken": idToken,
                    "accessToken": result?.user.accessToken.tokenString ?? "",
                    "givenName": profile?.givenName ?? "",
                    "familyName": profile?.familyName ?? "",
                    "fullName": profile?.name ?? "",
                    "email": profile?.email ?? "",
                    "picture": profile?.imageURL(withDimension: 200)?.absoluteString ?? ""
                ])
            }
        }
    }
}
