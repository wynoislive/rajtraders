# Expo OTA Background Update — Reference

Standard standalone reference for the `expo-ota-background-update` skill.

## 1. Prerequisites

Install Expo Updates:

```bash
npx expo install expo-updates
```

Configure EAS Update / Expo Updates for the project. The app's update URL and runtime version must be configured correctly for production OTA updates.

The project may use either `@/` imports or relative imports. Match the existing project's import configuration.

## 2. File layout

```text
your-expo-app/
├── app/
│   └── _layout.tsx
├── components/
│   └── update-modal.tsx
└── lib/
    └── ota-update.ts
```

## 3. `lib/ota-update.ts`

Keep OTA check/download logic independent from the UI.

```typescript
import * as Updates from "expo-updates";

export type OtaUpdateStatus =
  | "idle"
  | "checking"
  | "downloading"
  | "ready";

export async function checkAndDownloadOtaUpdate(
  onStatus?: (status: OtaUpdateStatus) => void,
): Promise<boolean> {
  try {
    onStatus?.("checking");

    const update = await Updates.checkForUpdateAsync();

    if (!update.isAvailable) {
      onStatus?.("idle");
      return false;
    }

    onStatus?.("downloading");

    await Updates.fetchUpdateAsync();

    onStatus?.("ready");
    return true;
  } catch {
    onStatus?.("idle");
    return false;
  }
}
```

The function returns:

- `false` when no update is available or the operation fails.
- `true` when an update was successfully downloaded.

No UI should be displayed during the check or download.

## 4. `components/update-modal.tsx`

The modal is displayed only after `fetchUpdateAsync()` succeeds.

```tsx
import * as Updates from "expo-updates";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type UpdateModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function UpdateModal({
  visible,
  onClose,
}: UpdateModalProps) {
  async function restartApp() {
    await Updates.reloadAsync();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Update installed</Text>

          <Text style={styles.message}>
            A new update has been downloaded and is ready to use.
            Restart the app to apply the update.
          </Text>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.button}>
              <Text style={styles.buttonText}>Later</Text>
            </Pressable>

            <Pressable onPress={restartApp} style={styles.button}>
              <Text style={styles.buttonText}>Restart</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  message: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
  },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
```

Adapt the colors, typography, spacing, and button styling to the project's existing design system.

The required behavior is:

- `visible=true` only after the OTA download succeeds.
- `Later` calls `onClose()`.
- `Restart` calls `Updates.reloadAsync()`.

## 5. Update manager

The root layout can own the update lifecycle.

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { UpdateModal } from "@/components/update-modal";
import { checkAndDownloadOtaUpdate } from "@/lib/ota-update";

function OtaUpdateManager() {
  const [updateReady, setUpdateReady] = useState(false);
  const runningRef = useRef(false);

  const checkForUpdate = useCallback(async () => {
    if (runningRef.current) {
      return;
    }

    runningRef.current = true;

    try {
      const ready = await checkAndDownloadOtaUpdate();

      if (ready) {
        setUpdateReady(true);
      }
    } finally {
      runningRef.current = false;
    }
  }, []);

  useEffect(() => {
    void checkForUpdate();

    const subscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          void checkForUpdate();
        }
      },
    );

    return () => subscription.remove();
  }, [checkForUpdate]);

  return (
    <UpdateModal
      visible={updateReady}
      onClose={() => setUpdateReady(false)}
    />
  );
}
```

Mount it from the root layout/navigation:

```tsx
function RootNavigation() {
  return (
    <>
      {/* Stack / Tabs */}
      <OtaUpdateManager />
    </>
  );
}
```

The update manager should remain mounted for the lifetime of the application.

## 6. User experience

### No update

```text
App opens
   |
   v
Check for update
   |
   v
No update
   |
   v
Normal app
```

There is no visible update UI.

### Update available

```text
App opens
   |
   v
Check for update
   |
   v
Update available
   |
   v
Download silently
   |
   v
Normal app remains visible
   |
   v
Download completes
   |
   v
Show modal
```

### Restart modal

```text
┌─────────────────────────────────────┐
│                                     │
│  Update installed                   │
│                                     │
│  A new update has been downloaded   │
│  and is ready to use. Restart the   │
│  app to apply the update.           │
│                                     │
│                 Later   Restart     │
│                                     │
└─────────────────────────────────────┘
```

### Later

```text
Later
  |
  v
Close modal
  |
  v
Continue using current app
```

No restart occurs.

### Restart

```text
Restart
   |
   v
Updates.reloadAsync()
   |
   v
App reloads
   |
   v
Downloaded OTA update is applied
```

## 7. Important implementation details

### Do not duplicate downloads

Use an in-flight guard such as:

```tsx
const runningRef = useRef(false);
```

Before starting a check:

```tsx
if (runningRef.current) {
  return;
}

runningRef.current = true;
```

Always release it in `finally`:

```tsx
try {
  // check/download
} finally {
  runningRef.current = false;
}
```

This prevents an initial mount check and a foreground event from starting concurrent OTA operations.

### Do not show download progress

The update should be intentionally invisible while downloading.

Do not add:

- downloading banners
- progress bars
- spinners
- blocking screens
- "Downloading update..." alerts

The user only sees the modal after the update has finished downloading.

### Do not automatically restart

Never call:

```typescript
Updates.reloadAsync();
```

until the user explicitly taps `Restart`.

## 8. Error handling

If `checkForUpdateAsync()` fails:

```text
Failure
  |
  v
Ignore error
  |
  v
Continue app
```

If `fetchUpdateAsync()` fails:

```text
Failure
  |
  v
Do not show modal
  |
  v
Continue app
```

The current app version remains usable.

A later app foreground event can attempt the update again.

## 9. Design requirements

The update modal should:

- clearly communicate that the update has been downloaded
- explain that a restart is required to apply it
- provide `Later`
- provide `Restart`
- allow the user to dismiss with `Later`
- never automatically restart the app
- use the existing project's theme/design system
- work in light and dark themes when the project supports both

The modal is the only update-specific UI.

## 10. Migration from the old forced-update skill

If migrating an implementation based on the previous forced-update pattern, remove:

```text
forcedUpdate
useForcedOtaUpdate
resolveForcedOtaUpdateForPlatform
UpdateBanner
update-banner-preview
PostHog OTA flags
platform-specific OTA payloads
```

The new architecture is:

```text
OtaUpdateManager
      |
      +--> checkAndDownloadOtaUpdate()
      |
      +--> updateReady
      |
      └--> UpdateModal
              |
              +--> Later
              |
              └--> Restart
```

The behavioral change is:

```text
OLD
forced/silent decision
      ↓
downloading banner
      ↓
ready state
      ↓
restart prompt

NEW
check automatically
      ↓
silent background download
      ↓
restart modal
      ↓
Later OR Restart
```

## 11. Troubleshooting

| Problem | Check |
|---|---|
| Update never downloads | Verify `expo-updates` and EAS Update configuration |
| Modal never appears | Verify `fetchUpdateAsync()` returns successfully |
| Multiple downloads start | Verify the in-flight guard is present |
| Modal appears repeatedly | Ensure `Later` sets `updateReady` to `false` |
| Restart does not apply update | Verify `Updates.reloadAsync()` is reached and Expo Updates is configured correctly |
| App is blocked during startup | Ensure OTA work is not awaited by the root navigation before rendering |
| User sees download progress | Remove any downloading banner/progress UI |

## 12. Final behavior contract

The implementation should always follow this sequence:

```text
OPEN APP
   ↓
CHECK
   ↓
DOWNLOAD IN BACKGROUND
   ↓
DOWNLOAD COMPLETE
   ↓
SHOW "UPDATE INSTALLED" MODAL
   ↓
   ├── LATER → CLOSE MODAL
   │
   └── RESTART → Updates.reloadAsync()
```

No PostHog, feature flags, forced-update configuration, platform toggles, or downloading UI are part of this skill.
