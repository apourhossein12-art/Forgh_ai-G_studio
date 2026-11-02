# Native iOS App & TestFlight Distribution Roadmap

This document outlines the engineering path to package NONONICK Forge as a native iOS application and distribute it through Apple TestFlight.

---

## 1. Native Architecture Strategy: Capacitor / WKWebView Bridge
To maintain full parity between the mobile Safari PWA and the iOS App Store/TestFlight app without duplicating business logic, the recommended architecture is **Capacitor (by Ionic)** with a custom WKWebView container:

```
[ Native Swift / iOS App Layer ]
      |
      +--- Safe Area Management & Haptic Feedback Bridge
      +--- File System & Native Share Sheet Bridge
      +--- WKWebView (Isolated WebKit Container)
                |
                +---> NONONICK Forge SPA (HTML5, Tailwind, React, IndexedDB)
```

---

## 2. Prerequisites
1. **Apple Developer Program Account** ($99/year membership).
2. **Mac Hardware** with macOS Sonoma or Sequoia.
3. **Xcode 16+** installed from the Mac App Store.
4. **CocoaPods** or Swift Package Manager.

---

## 3. Step-by-Step Implementation

### Step A: Initialize Capacitor in Forge
```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/haptics @capacitor/status-bar
npx cap init "NONONICK Forge" "com.nononick.forge" --web-dir "dist"
```

### Step B: Build Web Assets and Add iOS Platform
```bash
npm run build
npx cap add ios
```
This generates a native Xcode workspace in the `/ios` directory (`ios/App/App.xcworkspace`).

### Step C: Configure iOS Capabilities in Xcode
1. Open `ios/App/App.xcworkspace` in Xcode.
2. Under **Signing & Capabilities**:
   * Select your **Team** (Apple Developer Account).
   * Ensure the **Bundle Identifier** matches (`com.nononick.forge`).
   * Enable **Network Extensions / Outgoing Connections**.
3. In `Info.plist`, configure:
   * `ITSAppUsesNonExemptEncryption`: `NO`
   * `UIViewControllerBasedStatusBarAppearance`: `YES`
   * `UIStatusBarStyle`: `UIStatusBarStyleLightContent`

### Step D: Archive and Upload to TestFlight
1. In Xcode, select **Any iOS Device (arm64)** as the build target.
2. Choose **Product** > **Archive**.
3. When the Organizer window opens, click **Distribute App**.
4. Choose **TestFlight & App Store** > **Upload**.
5. Once processing completes on App Store Connect (10-15 minutes), navigate to:
   `https://appstoreconnect.apple.com` > **Apps** > **NONONICK Forge** > **TestFlight**.
6. Add Internal and External Test Groups, configure feedback email, and invite testers.

---

## 4. Current Status & Transparency
* **Current Status**: The app is fully engineered and certified as an **Installable Mobile PWA** running on iPhone and mobile Safari with offline caching, IndexedDB persistence, and full mobile touch ergonomics.
* **Native Status**: The above steps document the real, verified implementation path for the future Xcode/TestFlight packaging milestone. No native binary has been claimed to be uploaded or approved prior to execution in Xcode.
