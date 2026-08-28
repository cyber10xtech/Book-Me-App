# BookMe Universal + Deferred Deep Link System

Complete implementation of Apple Universal Links, Android App Links, deferred
deep linking, provider validation, and funnel analytics — no third-party SDK.

---

## What was changed / added

### New source files
| File | Purpose |
|---|---|
| `src/services/deepLinks.ts` | URL builder, parser, `shareProvider()`, platform detection |
| `src/services/pendingLink.ts` | localStorage store for pending link (7-day TTL) |
| `src/services/deepLinkAnalytics.ts` | Fire-and-forget funnel event tracking via sendBeacon |
| `src/hooks/useDeepLinkRouter.ts` | Capacitor `appUrlOpen` + `getLaunchUrl` listener |
| `src/hooks/useDeferredDeepLink.ts` | Post-auth pending link restoration with provider validation |
| `src/pages/ProviderProfileBySlugPage.tsx` | `/p/:slug` route — deferred link save + store redirect |

### Modified files
| File | Change |
|---|---|
| `src/App.tsx` | Added 2 imports, 2 hook calls, 1 route (`/p/:slug`) |
| `src/pages/ProviderProfilePage.tsx` | `handleShare` replaced with `shareProvider()` |
| `ios/App/App/App.entitlements` | Added `com.apple.developer.associated-domains` |
| `ios/App/App/AppDelegate.swift` | Added Universal Link debug log in `continueUserActivity` |
| `vercel.json` | Added AASA/assetlinks headers, excluded `.well-known/` from SPA rewrite |

### New static files
| File | Purpose |
|---|---|
| `public/.well-known/apple-app-site-association` | iOS Universal Links config |
| `public/.well-known/assetlinks.json` | Android App Links config |

### New Supabase files
| File | Purpose |
|---|---|
| `supabase/migrations/20260809_deeplink_system.sql` | `slug` column + `deep_link_events` table + funnel view |
| `supabase/functions/track-deep-link-event/index.ts` | Analytics ingestion edge function |

---

## Before you deploy — two manual steps required

### 1. Fill in your Apple Team ID

Open `public/.well-known/apple-app-site-association` and replace both
`TEAMID` placeholders with your 10-character Apple Developer Team ID.

Find it at: https://developer.apple.com/account → Membership → Team ID

```json
"appIDs": ["ABC123DEF4.com.bookmebusiness.customerapp1"]
```

Do the same in `ios/App/App/App.entitlements` — Xcode reads this file, but
also add the Associated Domains capability manually in Xcode:
- Open `ios/App/App.xcworkspace`
- Target → Signing & Capabilities → `+` → Associated Domains
- Add: `applinks:bookme.app` and `applinks:www.bookme.app`

### 2. Fill in your Android SHA-256 fingerprint

Open `public/.well-known/assetlinks.json` and replace
`REPLACE_WITH_YOUR_SHA256_CERT_FINGERPRINT` with your real fingerprint.

**Get it from Google Play Console:**
Play Console → Your App → Setup → App signing → App signing key certificate → SHA-256

**Or from your keystore:**
```bash
keytool -list -v -keystore your-release.keystore -alias your-alias
```

---

## Android manifest change (manual — not in source files)

Open `android/app/src/main/AndroidManifest.xml`.

Find `<activity android:name="com.getcapacitor.BridgeActivity" ...>` and add
these two intent-filters INSIDE that `<activity>` element:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="bookme.app" android:pathPattern="/p/.*" />
    <data android:scheme="https" android:host="bookme.app" android:pathPattern="/provider/.*" />
</intent-filter>

<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="www.bookme.app" android:pathPattern="/p/.*" />
    <data android:scheme="https" android:host="www.bookme.app" android:pathPattern="/provider/.*" />
</intent-filter>
```

Also confirm the activity has:
- `android:launchMode="singleTask"` (prevents duplicate back stacks)
- `android:exported="true"` (required API 31+ with VIEW intent-filter)

---

## Supabase setup

```bash
# Run the migration
supabase db push --project-ref trnsuruvwdzfrhfaboxe

# Deploy the analytics edge function
supabase functions deploy track-deep-link-event --project-ref trnsuruvwdzfrhfaboxe
```

---

## End-to-end flow

```
[Sharer taps Share button on provider profile]
  → shareProvider() builds https://bookme.app/p/{slug}?pid={uuid}&ref=profile_share
  → savePendingLink() writes to localStorage
  → trackShareGenerated() fires analytics
  → navigator.share() opens OS share sheet

[Recipient taps the link]
  ├─ App installed → OS intercepts (no browser) → appUrlOpen → useDeepLinkRouter
  │                  → navigate("/provider/:id") immediately
  │
  └─ Not installed → Browser opens bookme.app/p/{slug}
                     → ProviderProfileBySlugPage (web)
                       1. Resolves provider ID (from ?pid= or Supabase lookup)
                       2. savePendingLink() to localStorage
                       3. trackLinkOpened() + trackStoreRedirect() via sendBeacon
                       4. Detects iOS/Android from user-agent
                       5. window.location.replace(App Store / Play Store)

[User installs BookMe, opens app, signs in]
  → useDeferredDeepLink() fires
  → getPendingLink() reads localStorage
  → validateProvider() — checks provider exists + role = "provider"
  → trackDeferredRestored()
  → clearPendingLink()
  → navigate("/provider/:id")
  → toast("✨ Taking you to the profile you were checking out!")
```

---

## iOS note on deferred deep linking

Safari's localStorage is **not** shared with WKWebView on iOS. The deferred
path (save in browser → install → restore in app) works reliably on **Android**
because Chrome shares localStorage with Android WebView.

On iOS, the primary mechanism is Universal Links — if the app is already
installed, iOS intercepts the tap at the OS level and opens the app directly.
For true post-install deferred deep linking on iOS (app not yet installed),
a future integration with Branch.io or Firebase Dynamic Links would be needed.
The architecture here is designed for that: replace the `savePendingLink()` call
in `ProviderProfileBySlugPage` with a Branch/Firebase SDK call, and
`useDeferredDeepLink` stays unchanged.

---

## Analytics

Six events cover the full funnel:

| Event | Fired by | Auth? |
|---|---|---|
| `share_generated` | `shareProvider()` in ProviderProfilePage | Yes |
| `link_opened` | `ProviderProfileBySlugPage` (web) | No |
| `store_redirect` | `ProviderProfileBySlugPage` (web) | No |
| `app_opened` | `useDeepLinkRouter` | No |
| `deferred_restored` | `useDeferredDeepLink` | Yes |
| `deferred_cleared` | `useDeferredDeepLink` | Yes |

**Funnel conversion query:**
```sql
SELECT
  COUNT(*) FILTER (WHERE event = 'store_redirect')    AS sent_to_store,
  COUNT(*) FILTER (WHERE event = 'deferred_restored') AS converted,
  ROUND(100.0 *
    COUNT(*) FILTER (WHERE event = 'deferred_restored') /
    NULLIF(COUNT(*) FILTER (WHERE event = 'store_redirect'), 0), 1
  ) AS conversion_pct
FROM deep_link_events
WHERE created_at >= now() - interval '30 days';
```

---

## Extending to new link kinds

The system uses a discriminated union (`PendingLink.kind`). To add a coupon link:

1. `pendingLink.ts` — `CouponPendingLink` interface is already defined in the union.
2. Build a `buildCouponShareUrl()` in `deepLinks.ts`.
3. Create a `CouponPage.tsx` that calls `savePendingLink({ kind: "coupon", ... })`.
4. Add `case "coupon":` in `useDeferredDeepLink` switch — validate + navigate.

Nothing else in the system changes.
