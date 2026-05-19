# Cash Mgr. Mobile App

React Native + Expo mobile application for iOS and Android.

## Development

From the monorepo root:

```bash
pnpm dev:mobile
```

Or from this directory (apps/mobile):

```bash
pnpm start
```

Then:

- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on device

## Building

### Simulator / Development

For simulator or development with Expo Go:

```bash
pnpm start
```

Then press `i` for iOS simulator or `a` for Android emulator.

### Physical iOS Device Build

Building for a physical device requires additional setup.

#### Prerequisites

1. **Enable Developer Mode on your iPhone** (iOS 16+):
   - Settings → Privacy & Security → Developer Mode → Enable
   - Device will restart

2. **Connect your iPhone via USB**

3. **Pair device with Xcode** (first time only):
   - Open Xcode: Cmd+Shift+2 (Devices and Simulators)
   - Trust the computer on your iPhone when prompted
   - Wait for device pairing to complete

#### Method 1: Xcode GUI (Recommended for first-time setup)

1. Start Metro bundler in a separate terminal:

   ```bash
   pnpm start
   ```

   Keep this running - the app needs it to load JavaScript.

2. Open the Xcode workspace:

   ```bash
   open ios/CashManager.xcworkspace
   ```

3. Configure signing (first time only):
   - Select "CashManager" project in the left sidebar
   - Select "CashManager" target
   - Go to "Signing & Capabilities" tab
   - Check "Automatically manage signing"
   - Select your Team (your Apple ID)
   - Xcode will generate a provisioning profile

4. Select your device:
   - At the top of Xcode, click the device dropdown
   - Select your iPhone

5. Build and run:
   - Click the Play button (▶) or press Cmd+R
   - First build takes 3-5 minutes
   - App will automatically install and launch on your iPhone

#### Method 2: Command Line

Once signing is configured via Xcode:

```bash
# Start Metro bundler in one terminal
pnpm start

# In another terminal, build and deploy
pnpm run ios:device
```

#### Running the App

After the app is installed:

1. **Ensure Metro is running** (see terminal for "Waiting on <http://localhost:8081>")
2. **Ensure iPhone and Mac are on the same WiFi network**
3. **Launch the app** on your iPhone
4. App will connect to Metro at your Mac's IP address (e.g., `192.168.0.181:8081`)

If you see "No script URL provided" error:

- Check Metro is running (`pnpm start`)
- Shake your iPhone to open developer menu
- Tap "Configure Bundler" and enter your Mac's IP
- Tap "Reload"

#### Troubleshooting

##### app.json Changes Not Taking Effect

Changes to `app.json` (like `userInterfaceStyle`, bundle identifiers, or plugins) require a clean native rebuild:

```bash
npx expo prebuild --clean --platform ios
pnpm run ios:device
```

A simple reload or restart won't apply these changes - they're baked into the native project during prebuild.

##### Code Signing Error: errSecInternalComponent

If you see `errSecInternalComponent` during build:

1. Open **Keychain Access** app
2. Select "login" keychain → "My Certificates"
3. Find "Apple Development: <your@email.com>"
4. Double-click → Expand "Trust" section
5. Set "Code Signing" to **"Always Trust"**
6. Right-click certificate → Get Info → "Access Control" tab
7. Select **"Allow all applications to access this item"**
8. Save and rebuild

##### Device Not Showing in Xcode

- Unlock your iPhone
- Reconnect USB cable
- Check "Trust This Computer" on iPhone
- Open Xcode: Cmd+Shift+2 to verify device appears

##### Build Database Locked

```bash
pkill -f xcodebuild
rm -rf ios/build
```

##### Metro Connection Issues iOS

- Verify iPhone and Mac are on same WiFi
- Get your Mac's IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Shake iPhone → Configure Bundler → Enter Mac's IP

#### Device Build Limitations (Free Apple ID)

- ⚠️ App expires after 7 days (needs rebuild)
- ⚠️ Limited to 3 apps on device at once
- ⚠️ Can only install on your own devices
- ✅ Perfect for development and testing
- ✅ No paid Apple Developer account needed

#### With Apple Developer Account ($99/year)

- ✅ Apps last 1 year before re-signing
- ✅ Unlimited apps
- ✅ TestFlight distribution
- ✅ App Store publishing

### Physical Android Device Build

Building for Android devices is simpler than iOS - no code signing complexity or paid accounts required.

#### Android Prerequisites

1. **Enable Developer Mode on your Android device**:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - You'll see "You are now a developer!"

2. **Enable USB Debugging**:
   - Go to Settings → System → Developer Options
   - Enable "USB debugging"

3. **Connect your Android device via USB**

4. **Accept USB debugging prompt** on your device when connecting

#### Method 1: Command Line (Recommended)

1. Start Metro bundler in a separate terminal:

   ```bash
   pnpm start
   ```

   Keep this running - the app needs it to load JavaScript.

2. In another terminal, build and deploy:

   ```bash
   pnpm run android:device
   ```

   Or from the monorepo root:

   ```bash
   pnpm --filter @cashmgr/mobile run android:device
   ```

#### Method 2: Android Studio (Alternative)

1. Start Metro bundler:

   ```bash
   pnpm start
   ```

2. Open Android Studio and open the project:

   ```bash
   open -a "Android Studio" android/
   ```

3. Wait for Gradle sync to complete

4. Select your device from the device dropdown

5. Click the Run button (▶) or press Ctrl+R

#### Running on Android Device

After the app is installed:

1. **Ensure Metro is running** (see terminal for "Waiting on `http://localhost:8081`")
2. **Ensure Android device and Mac are on the same WiFi network** (for development mode)
3. **Launch the app** on your Android device
4. App will connect to Metro at your Mac's IP address

If you see connection errors:

- Shake your device or press Cmd+M (in emulator) to open developer menu
- Tap "Settings" → "Debug server host & port"
- Enter your Mac's IP and port (e.g., `192.168.0.181:8081`)
- Tap "Reload"

#### Android Troubleshooting

##### Device Not Detected

If `adb devices` shows "unauthorized":

- Disconnect and reconnect USB
- Check the USB debugging prompt on your device
- Accept the authorization

If device still not detected:

```bash
adb kill-server
adb start-server
adb devices
```

##### Build Errors

Clean and rebuild:

```bash
cd android
./gradlew clean
cd ..
pnpm run android:device
```

##### Metro Connection Issues Android

If the app can't connect to Metro over WiFi, use USB reverse port forwarding:

```bash
adb reverse tcp:8081 tcp:8081
```

This forwards the Metro port from your Mac to the Android device over USB.

#### Android vs iOS Development

Advantages of Android development:

- ✅ No code signing or certificates needed
- ✅ No expiring apps (unlike free iOS builds)
- ✅ Easier device detection and debugging
- ✅ Free for all users
- ✅ USB port forwarding for Metro (no WiFi required)

### EAS Build — iOS & Android (Production)

Builds run locally — no cloud queue. Requires [EAS CLI](https://docs.expo.dev/eas/) and platform SDKs.

```bash
# One-time setup
npm install -g eas-cli
eas login          # authenticate with your Expo account
```

#### Android (any machine with JDK 17 + Android SDK)

```bash
# APK for direct device install / QA
eas build --platform android --profile preview --local

# AAB for Google Play Store
eas build --platform android --profile production --local
```

#### iOS (macOS + Xcode only)

```bash
# Ad Hoc build for real-device testing
eas build --platform ios --profile preview --local

# App Store build
eas build --platform ios --profile production --local
```

#### Submit to Stores

Fill in the placeholder values in `eas.json` first, then:

```bash
eas submit --platform ios --latest
eas submit --platform android --latest
```

## Features

- Home screen with balance overview
- Add transaction form
- Accounts list
- Settings screen

## Database

Uses expo-sqlite for local SQLite database storage.

## Navigation

Uses Expo Router with file-based routing:

- `(tabs)/_layout.tsx` - Tab navigation layout
- `(tabs)/index.tsx` - Home screen
- `(tabs)/add.tsx` - Add transaction
- `(tabs)/accounts.tsx` - Accounts list
- `(tabs)/settings.tsx` - Settings
