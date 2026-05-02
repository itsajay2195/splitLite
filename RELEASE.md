# Baagam — Android Release Guide

## AAB vs APK — Why AAB?

| | APK | AAB |
|---|---|---|
| What it is | Ready-to-install app file | Bundle that Google Play compiles into APKs |
| Play Store | ❌ Not accepted for new apps | ✅ Required since Aug 2021 |
| Size on user's device | Larger (includes all architectures) | Smaller (Play strips unused code per device) |
| Use APK for | Direct installs (testing, sideloading) | — |
| Use AAB for | — | Play Store submission |

**Simple rule:** AAB for Play Store. APK for testing on a device directly.

---

## What We Did

### 1. Cleaned up the Manifest
- Removed unused `INTERNET` permission from `AndroidManifest.xml`
- App is fully offline — unused permissions raise flags in Play Store review

### 2. Generated a Signing Keystore
```bash
keytool -genkeypair -v -storetype PKCS12 -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -keystore android/app/baagam-release.keystore \
  -alias baagam
```
- Keystore lives at `android/app/baagam-release.keystore`
- **Never commit this file to git** — it's in `.gitignore`
- **Back it up somewhere safe** — if you lose it, you can never update the app on Play Store

### 3. Stored Credentials in gradle.properties
```
SPLITLITE_UPLOAD_STORE_FILE=splitlite-release.keystore
SPLITLITE_UPLOAD_KEY_ALIAS=splitlite
SPLITLITE_UPLOAD_STORE_PASSWORD=splitlite2024
SPLITLITE_UPLOAD_KEY_PASSWORD=splitlite2024
```
- Credentials live in `android/gradle.properties` (also gitignored)
- Never hardcode passwords directly in `build.gradle`

### 4. Wired Signing into build.gradle
Added a `release` signing config that reads from `gradle.properties`:
```gradle
signingConfigs {
    release {
        storeFile file(SPLITLITE_UPLOAD_STORE_FILE)
        storePassword SPLITLITE_UPLOAD_STORE_PASSWORD
        keyAlias SPLITLITE_UPLOAD_KEY_ALIAS
        keyPassword SPLITLITE_UPLOAD_KEY_PASSWORD
    }
}
```

### 5. Built the AAB
```bash
cd android && ./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## To Rebuild After Changes

```bash
cd android
./gradlew clean           # clear old build artifacts
./gradlew bundleRelease   # build new signed AAB
```

---

## To Build a Test APK (direct install)

```bash
cd android && ./gradlew assembleRelease
```
Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## Play Store Upload Checklist

- [x] Signed AAB built
- [x] App icon set (all mipmap sizes)
- [x] App name: Baagam
- [x] applicationId: com.baagam
- [x] versionCode: 1 / versionName: 1.0
- [ ] Privacy policy URL
- [ ] Store listing (description, screenshots)
- [ ] Play Console account ($25 one-time)

---

## Critical Reminders

> **Back up your keystore.** Store `baagam-release.keystore` and the passwords
> somewhere outside the repo (Google Drive, iCloud, password manager).
> Losing the keystore = losing the ability to update your app forever.
