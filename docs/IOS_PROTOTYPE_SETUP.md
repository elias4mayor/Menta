# MENTA iPhone prototype: live workout on the Lock Screen

**Goal:** run MENTA on your own iPhone. Start a workout, lock the phone, and track it from the Lock Screen and Dynamic Island. That includes the Set done, +30s, and Skip buttons.

This is a **personal prototype**:
- It uses a free Apple account and installs only on your phone.
- It isn't on TestFlight or the App Store.
- Apps signed with a free account stop opening after **7 days**. Run it from Xcode again to reinstall.

---

## What's in this branch

| Path | What it is |
|---|---|
| `capacitor.config.ts`, `capacitor-shell/` | iPhone app shell. It loads the MENTA site from your Mac over Wi-Fi |
| `src/lib/native/live-workout.ts` | Workout session logic, plus the bridge to iOS |
| `src/components/LiveWorkout.tsx` | In-app workout mode (rest timer, Set done, +30s, Skip). Works in any browser too |
| `src/components/PlanCard.tsx` | Adds a **Start workout** button on Home |
| `native/ios/Shared/*.swift` | Shared model and button actions → add to **both** targets |
| `native/ios/App/*.swift` | Native bridge → **App** target only |
| `native/ios/Widget/*.swift` | Lock Screen and Dynamic Island design → **widget** target only |

---

## 0. One-time installs (about 30–60 min, mostly downloads)

1. **Xcode:** install from the Mac App Store and open it once to accept the license.
2. **Node.js 22 or newer:** the Capacitor 8 tools require it. Check with `node -v`. If it's lower, install the LTS version from nodejs.org.
3. **iPhone requirements:** iOS 17 or newer. The Lock Screen buttons need iOS 17.

## 1. Get the code

```bash
cd ~/path/to/Menta
git fetch origin
git checkout feat/ios-live-workout
npm install
```

## 2. Start MENTA on your Mac, reachable from the phone

1. Your Mac and iPhone must be on the **same Wi-Fi**.
2. Find your Mac's IP address: System Settings → Wi-Fi → Details → IP address.
3. `next.config.ts` already allows `192.168.1.161`. If your IP is different, update `allowedDevOrigins` there.

```bash
npm run dev -- -H 0.0.0.0
```

**Check:** open `http://<your-mac-ip>:3000` in Safari on your iPhone. If MENTA loads, you're ready.

**Sign in with email and password, not Google.** Google blocks its sign-in page inside embedded app browsers.

## 3. Create the iOS project

```bash
CAP_SERVER_URL=http://<your-mac-ip>:3000 npx cap add ios
CAP_SERVER_URL=http://<your-mac-ip>:3000 npx cap sync ios
npx cap open ios
```

Xcode opens `ios/App`.

**Every time** you change the IP or pull new web code, run `npx cap sync ios` again with `CAP_SERVER_URL`.

## 4. Sign the app with your free Apple account

1. In Xcode, click the blue **App** project in the left sidebar, then select the **App** target.
2. Go to **Signing & Capabilities**:
   - Check **Automatically manage signing**.
   - Set **Team** to **Add an Account…** → sign in with your Apple ID → choose "(Personal Team)".
   - If Xcode says `coach.menta.app` is taken, change the **Bundle Identifier** to something unique, like `coach.menta.app.elias`.
3. Go to **General** → **Minimum Deployments** and set iOS to **17.0**.

## 5. Turn on Live Activities for the app

1. Select the **App** target → **Info** tab.
2. Hover any row → click **+** → type `Supports Live Activities` → set the value to **YES**.

## 6. Add the native bridge files to the app

1. In Finder, open `native/ios/Shared` and `native/ios/App` from this repo.
2. Drag these four files into Xcode's **App** folder (the yellow folder under the App project):
   - `Shared/MentaWorkoutAttributes.swift`
   - `Shared/MentaWorkoutIntents.swift`
   - `App/MentaLiveWorkoutPlugin.swift`
   - `App/MentaViewController.swift`
3. In the dialog:
   - Check **Copy items if needed**.
   - Under **Add to targets**, check **App**.

## 7. Point the app's main screen at MENTA's view controller

1. Open `App/Main.storyboard`.
2. Select **Bridge View Controller** in the outline.
3. Open the right-hand **Identity inspector**: View → Inspectors → Identity.
4. Set **Class** to `MentaViewController` and **Module** to `App`.

**If you skip this,** the app runs, but the workout stays in-app only and never appears on the Lock Screen.

## 8. Add the Lock Screen widget target

1. **File → New → Target… → Widget Extension → Next**.
2. Fill in the options:
   - **Product Name:** `MentaWorkoutWidget`
   - **Include Live Activity:** checked
   - **Include Control:** unchecked
   - **Include Configuration App Intent:** unchecked
3. Click **Finish**. If Xcode asks to activate the new scheme, click **Activate**; you'll switch back to the App scheme in step 9.
4. **Delete every Swift file Xcode generated** in the new `MentaWorkoutWidget` folder. Choose Move to Trash. Keep `Info.plist` and `Assets.xcassets`.
5. Drag in `native/ios/Widget/MentaWorkoutLiveActivity.swift` and `native/ios/Widget/MentaWorkoutWidgetBundle.swift`:
   - Check **Copy items if needed**.
   - Target: **MentaWorkoutWidget** only.
6. Add the shared files to the widget target as well. Select `MentaWorkoutAttributes.swift` and `MentaWorkoutIntents.swift` in the App folder, then in the right-hand **File inspector → Target Membership**, check **MentaWorkoutWidgetExtension** so both targets are checked.
7. Select the **MentaWorkoutWidgetExtension** target:
   - **Signing & Capabilities:** choose the same Personal Team.
   - **General:** set Minimum Deployments to **iOS 17.0**.

## 9. Run it on your iPhone

1. Plug the iPhone into the Mac. Unlock it and tap **Trust**.
2. On the iPhone, turn on **Settings → Privacy & Security → Developer Mode**. It restarts the phone.
3. In Xcode's top bar, choose the **App** scheme and your iPhone as the destination. Press **Run** (▶).
4. The first time, the iPhone will say the developer isn't trusted. Go to **Settings → General → VPN & Device Management**, tap your Apple ID, then tap **Trust**. Run again.

## 10. Test the live workout

1. Sign in with email and password, then open **Home**.
2. In **Your plan**, tap **Start workout**. The workout sheet should say "on Lock Screen" at the top.
3. Lock the phone. The MENTA card appears on the Lock Screen.
4. Tap **Set done**. The set count goes up and a 1:30 rest timer starts counting down.
5. Try **+30s** and **Skip**.
6. Unlock and open MENTA. The in-app workout should match what you did on the Lock Screen.
7. Swipe home while unlocked. The Dynamic Island shows the exercise and the timer; long-press it for buttons.
8. Finish every set, or skip to the end, then tap **Save workout** in the app. This records the completion, the same as "Mark workout complete."

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `The Capacitor CLI requires NodeJS >=22.0.0` | Install Node 22 LTS or newer |
| `Set CAP_SERVER_URL…` error | Put `CAP_SERVER_URL=http://<mac-ip>:3000` in front of the `npx cap` command |
| White screen, or "could not connect" | The dev server isn't running with `-H 0.0.0.0`, the phone is on a different Wi-Fi, or the IP changed (re-run `cap sync`) |
| Page loads but buttons do nothing | Your IP isn't in `allowedDevOrigins` in `next.config.ts` |
| Workout works in-app but no Lock Screen card | Step 5 (`Supports Live Activities`) or step 7 (storyboard class) is missing. Also check that **Settings → MENTA → Live Activities** is on |
| Build error: "multiple @main" / "invalid redeclaration" | Xcode's generated widget files are still there. Delete them (step 8.4) |
| Build error: "cannot find MentaCompleteSetIntent in scope" in the widget | Step 8.6 was missed: the shared files need both target checkboxes |
| App stops opening after a week | Free-account limit. Plug in the phone and press Run again |

---

## Not built yet (on purpose)

- **Server-pushed updates:** coach-started sessions, or updates while the app has been killed for hours. These would need Apple push notifications and a paid Apple Developer account.
- **App Store or TestFlight:** this needs the $99/year Apple Developer Program, plus App Store review. Apple's guideline 4.2 rejects apps that are only a repackaged website.
- **Apple Watch app.**
