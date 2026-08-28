import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging
import AVFoundation

// Capacitor 8 note: CAPBridgeViewController no longer emits
// .capacitorViewDidAppear / .capacitorViewWillTransition notifications.
// Remove any code that relied on those observers.

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Firebase 12 requires FirebaseApp.configure() before any other Firebase call.
        FirebaseApp.configure()
        Messaging.messaging().delegate = self

        // NOTE: we deliberately do NOT set UNUserNotificationCenter.current().delegate
        // here. Capacitor's own bridge (CapacitorBridge/NotificationRouter) sets
        // itself as that delegate and already handles both foreground
        // presentation — via the PushNotifications.presentationOptions in
        // capacitor.config.json (already set to badge/sound/alert) — and tap
        // routing to the JS `pushNotificationActionPerformed` event. Overriding
        // it here doesn't just risk a stray compile error (ApplicationDelegateProxy
        // has no userNotificationCenter(...) forwarding API to call into); it also
        // fights Capacitor for the single delegate slot for no benefit.

        // Edge-to-edge: web content renders under the status bar.
        if let root = window?.rootViewController {
            root.view.insetsLayoutMarginsFromSafeArea = false
        }

        application.registerForRemoteNotifications()

        // Voice notes: WKWebView's getUserMedia (used to record voice notes in
        // ChatWindow.tsx) puts the shared AVAudioSession into .playAndRecord
        // without `.defaultToSpeaker`, which routes ALL subsequent audio
        // playback — including played-back voice notes — to the earpiece
        // receiver instead of the main speaker. At normal listening distance
        // this is inaudible, which is why recordings appeared to have "no
        // voice" even though the file itself was fine. Force speaker routing
        // up front and keep re-asserting it any time the OS changes the
        // route (e.g. right after a recording starts/stops).
        configureAudioSessionForSpeakerPlayback()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(audioRouteChanged),
            name: AVAudioSession.routeChangeNotification,
            object: nil
        )

        return true
    }

    // MARK: - Audio session (voice notes speaker routing)

    private func configureAudioSessionForSpeakerPlayback() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(
                .playAndRecord,
                mode: .default,
                options: [.defaultToSpeaker, .allowBluetoothHFP, .mixWithOthers]
            )
            try session.overrideOutputAudioPort(.speaker)
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            print("BookMe: failed to configure audio session — \(error.localizedDescription)")
        }
    }

    @objc private func audioRouteChanged(_ notification: Notification) {
        // WKWebView re-negotiates the audio session whenever getUserMedia
        // starts/stops recording a voice note, which resets our speaker
        // override. Re-apply it after every route change so playback
        // (both voice notes and any other in-app audio) stays on the
        // speaker instead of silently dropping to the earpiece.
        configureAudioSessionForSpeakerPlayback()
    }

    // MARK: - Remote notification registration

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        // Hand the raw APNs token to Firebase so it can mint/refresh the real
        // FCM registration token. We deliberately do NOT forward this raw
        // APNs token to Capacitor here — send-notification (our edge
        // function) calls the FCM v1 API, which requires an FCM token, not
        // an APNs device token. Posting the APNs token as if it were the
        // "registration" result is what was silently breaking iOS push:
        // the token would upsert into fcm_tokens fine, but every send to
        // fcm.googleapis.com would fail (invalid/unregistered), and
        // send-notification's cleanup logic would keep deleting it as stale.
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("BookMe: failed to register for remote notifications — \(error.localizedDescription)")
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }

    // MARK: - MessagingDelegate (Firebase 12)

    // This fires once Firebase has exchanged the APNs token for a real FCM
    // token (on initial registration AND whenever the token is refreshed).
    // Forward it to Capacitor's own notification name so the JS-side
    // `PushNotifications.addListener('registration', ...)` — wired up in
    // AuthContext.tsx / usePermissions.ts and stored via upsertFcmToken() —
    // receives the correct, usable FCM token instead of never firing at all
    // (previously nothing posted this notification, so on iOS the
    // "registration" event never fired and no token was ever saved).
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken = fcmToken else { return }
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: fcmToken
        )
    }

    // MARK: - App lifecycle

    func applicationWillResignActive(_ application: UIApplication) { }
    func applicationDidEnterBackground(_ application: UIApplication) { }
    func applicationWillEnterForeground(_ application: UIApplication) { }
    func applicationDidBecomeActive(_ application: UIApplication) { }
    func applicationWillTerminate(_ application: UIApplication) { }

    // MARK: - URL handling (custom scheme) & Universal Links

    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        // Universal Links: iOS calls this when the user taps a bookme.app URL
        // verified via the apple-app-site-association file. Forward to Capacitor
        // so it posts the `appUrlOpen` event to JS (consumed by useDeepLinkRouter).
        if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
           let url = userActivity.webpageURL {
            print("BookMe [Universal Link]: \(url.absoluteString)")
        }
        return ApplicationDelegateProxy.shared.application(
            application,
            continue: userActivity,
            restorationHandler: restorationHandler
        )
    }
}
