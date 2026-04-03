```markdown
# 🎮 Tilt Checkpoint

A tilt-controlled endless mobile game where the player navigates a ball through checkpoints while being chased by an increasingly aggressive enemy.

Built as a lightweight WebView-based Android app using HTML, JavaScript, and Capacitor.

---

# 🚀 Features

- Tilt-based controls using device orientation
- Endless stage progression
- Checkpoint + timer system
- Dynamic chaser mechanic
- Increasing difficulty over time
- Offline playable (no backend required)

---

# 📦 Project Structure

```

tilt_checkpoint/
│
├── index.html                # Main game file
├── assets/                   # Sounds, styles, etc.
├── apk-wrapper/              # Capacitor Android wrapper
│   ├── android/              # Native Android project
│   ├── sync-web-assets.sh    # Copies web files into Android
│   └── package.json

````

---

# ⚙️ Requirements (Fresh Setup)

Install the following:

### 1. Node.js
https://nodejs.org/

### 2. Java (JDK 17 REQUIRED)
```bash
brew install openjdk@17
````

Set Java:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$JAVA_HOME/bin:$PATH"
```

---

### 3. Android SDK (CLI only, no Android Studio required)

Download command line tools:
[https://developer.android.com/studio#command-tools](https://developer.android.com/studio#command-tools)

Install to:

```
~/Android/Sdk/cmdline-tools/latest
```

Set environment:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
```

---

### 4. Install SDK packages

```bash
sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

---

# 🛠️ Initial Setup

```bash
cd apk-wrapper
npm install
```

---

# 🔄 Sync Game Files

Whenever you update `index.html` or assets:

```bash
./sync-web-assets.sh
npx cap copy android
```

---

# 📱 Build APK / AAB

```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

Output:

```
android/app/build/outputs/bundle/release/app-release.aab
```

---

# 🔐 Signing Configuration (IMPORTANT)

Create:

```
apk-wrapper/android/key.properties
```

Example:

```
storePassword=YOUR_PASSWORD
keyPassword=YOUR_PASSWORD
keyAlias=YOUR_ALIAS
storeFile=/FULL/PATH/TO/YOUR_KEYSTORE.jks
```

Ensure `app/build.gradle` loads this file.

---

# 🔢 Versioning (Required for Play Store)

Edit:

```
android/app/build.gradle
```

Update:

```gradle
versionCode 2
versionName "1.0.1"
```

👉 versionCode must ALWAYS increase

---

# 🚀 Deploy to Google Play

1. Go to Play Console
2. Upload `.aab`
3. Use Internal Testing track
4. Install via Play Store

---

# 🐞 Common Issues & Fixes

## ❌ App crashes on launch

**Cause: MainActivity mismatch**

Fix:

* Ensure path:

  ```
  android/app/src/main/java/com/obbsco/tilt/MainActivity.java
  ```
* Ensure:

  ```java
  package com.obbsco.tilt;
  ```
* Ensure `applicationId` matches:

  ```gradle
  applicationId "com.obbsco.tilt"
  ```

---

## ❌ sdkmanager not found

Fix:

```bash
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

---

## ❌ Unsupported class file version

Fix: Use Java 17 ONLY

```bash
java -version
```

---

## ❌ invalid source release: 21

Fix: mismatch between Java + Gradle
→ Use JDK 17

---

## ❌ signingReleaseBundle FAILED

Fix:

* verify `key.properties`
* verify keystore path
* verify alias

---

## ❌ Version code already used

Fix:

```gradle
versionCode +1
```

---

# 🎮 Gameplay Notes

* Player spawns at portal exit position
* Chaser spawns 3 seconds after player
* Chaser resets speed on catch
* Player becomes immune for 3 seconds after being caught
* Endless progression system

---

# 🔮 Future Improvements

* Leaderboards (local / online)
* Skins and unlockables
* Sound + haptics polish
* Difficulty curve tuning
* Analytics integration

---

# 🧠 Dev Notes

* Built for rapid iteration
* No backend required
* Fully offline playable
* Optimized for lightweight deployment

---

# 🏁 Summary

This project demonstrates:

* mobile game design
* Android CLI build pipeline
* Capacitor WebView deployment
* Play Store publishing workflow

---

# 🙌 Credits

Developed by: **Victor Galang**

```

---

# 🔥 What You Now Have

This README:
- ✅ lets you rebuild from scratch
- ✅ prevents all errors you encountered
- ✅ documents your full deployment pipeline
- ✅ is GitHub-ready

---

# 🚀 Optional Upgrade

If you want next level, I can also generate:
- `.gitignore` (important for Android builds)
- automated build script (`build.sh`)
- Play Store optimized description + screenshots
- CI/CD pipeline (GitHub Actions → build APK automatically)

---

Just tell me 👍
```
