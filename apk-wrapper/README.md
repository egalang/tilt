# APK Wrapper Scaffold

This folder is a starter structure for wrapping the web game into an Android APK using Capacitor.

## What it does
- keeps your web game as the main codebase
- copies the web assets into `www/`
- gives you ready starter config for Android packaging

## Prerequisites
- Node.js and npm
- Android Studio
- Android SDK / platform tools
- Java JDK

## Basic flow
```bash
cd apk-wrapper
npm install
./sync-web-assets.sh
npx cap add android
npx cap copy android
npx cap open android
```

Then build the APK from Android Studio.

## Notes
- This scaffold does not include a generated `android/` project yet because that requires local tooling.
- After you run `npx cap add android`, Capacitor will create the Android project for you.
- Since the game assets are bundled into the app, the final Android build can be playable offline.
