# Maint Tool App Release Guide

This project now contains one shared offline app and two native projects:

- `ios/`: Apple App Store build
- `android/`: Google Play build
- `app.jsx`: shared app source
- `dist/`: generated offline web bundle

## Installed Mac Apps

- Xcode 26.6
- iOS 26.5 Simulator Runtime
- Android Studio 2026.1.2
- Android SDK 36, Build Tools 36.0.0, and Platform Tools 37.0.0
- Android 16 phone emulator images and an Android tablet emulator image

## Build Commands

Run these from the project folder:

```sh
pnpm run build
pnpm run sync
pnpm run open:ios
pnpm run open:android
```

`pnpm run sync` rebuilds the shared app and copies the latest files into both native projects.

## iPhone Testing

1. Open the iOS project with `pnpm run open:ios`.
2. Select an iPhone simulator in Xcode.
3. Press the Run button.
4. Test first launch while the Mac network is disabled.
5. Repeat on a small iPhone, iPhone 15 Pro, and Pro Max simulator.
6. Connect a physical iPhone for the final touch, keyboard, and safe-area test.

### Completed Simulator Checks

- iPhone SE: passed after applying a short-screen keypad layout.
- iPhone 15 Pro: passed, including the Dynamic Island safe area.
- iPhone 17 Pro Max: passed.
- Calculator, time arithmetic, unit conversion, history persistence, MEL,
  NEF/MOI, and ETC smoke tests passed.
- The packaged native app does not request internet permission or load remote
  runtime assets.

### Completed Physical iPhone Checks

- iPhone 15 Pro (iOS 26.5.2): paired with Xcode, signed, installed, and launched.
- Apple Personal Team development signing and device provisioning: passed.
- Calculator `100 + 2 = 102`: passed.
- MEL and NEF/MOI tab navigation and date results: passed.
- MEL specified-days entry and due-date calculation: passed.
- A focused `+DAYS` field uses the native keyboard height to lift the whole
  screen until the field sits 16px above the software keyboard.
- The status bar remains visible while shifted app content is clipped below its
  safe area.
- The software-keyboard placement passed on the iPhone 15 Pro and the matching
  iPhone 15 Pro simulator.

## Android Testing

1. Open the Android project with `pnpm run open:android`.
2. Create virtual devices in Android Studio Device Manager.
3. Test a small phone, Pixel-class phone, large phone, and tablet.
4. Test with Wi-Fi and mobile data disabled in the emulator.
5. Connect a physical Android device for the final touch and keyboard test.

### Completed Emulator Checks

- Small phone (720 x 1280): passed after applying a compact short-screen
  calculator layout that keeps every keypad row visible.
- Medium phone (1080 x 2400): passed, including `100 + 2 = 102`.
- Medium tablet (portrait): passed with the app filling the portrait workspace.
- Wi-Fi and mobile data disabled: passed.
- Android lint and debug APK builds: passed.
- The Android app does not request the `INTERNET` permission.

## Store Build Numbers

- Public version: `1.0.0`
- First build number / version code: `1`
- Every new upload keeps or changes the public version as needed and must increase the build number.

## Store Accounts

- Apple: Apple Developer Program and App Store Connect
- Android: Google Play Console

Account login, legal agreements, signing certificates, store listing text, screenshots, and final submission are completed after simulator and physical-device testing pass.

## Remaining Before Store Upload

1. Test one physical Android phone.
2. Create an App Store archive with the distribution team.
3. Create the App Store Connect app record, privacy answers, screenshots, and
   listing text.
4. Create an Android release signing key and an Android App Bundle (`.aab`).
5. Create the Google Play Console app record, data-safety answers, screenshots,
   and listing text.
