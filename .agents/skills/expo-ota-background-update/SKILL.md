---
name: expo-ota-background-update
description: Implements a standalone Expo OTA background-update flow that checks for and downloads available updates when the app opens, then shows a restart-required modal after the update is downloaded. The user can dismiss the modal with Later or restart the app to apply the update.
---

# Expo OTA Background Update

Use this skill when adding or fixing a standalone Expo OTA update flow.

The app automatically checks for an available Expo OTA update when it opens or becomes active. If an update is available, it downloads silently in the background. After the download completes, the app shows a restart-required modal.

The user is never forced to restart immediately.

## Behavior contract

| State | Behavior |
|---|---|
| No update available | Continue normally; no update UI |
| Update available | Download silently in the background |
| Download in progress | Keep normal app UI visible |
| Download completes | Show restart-required modal |
| `Later` | Close the modal and continue using the current app session |
| `Restart` | Call `Updates.reloadAsync()` to apply the downloaded update |
| Check/download fails | Fail silently and keep the app running |
| App opens/becomes active again | Check again if no update operation is already running |

## User-facing UI

There is no downloading banner.

The only update UI is a modal shown after the OTA update has been downloaded.

Recommended copy:

**Title**

`Update installed`

**Message**

`A new update has been downloaded and is ready to use. Restart the app to apply the update.`

**Buttons**

- `Later`
- `Restart`

`Later` only dismisses the modal.

`Restart` reloads the app using `Updates.reloadAsync()`.

## File layout

Use these paths consistently:

```text
your-expo-app/
├── app/
│   └── _layout.tsx
├── components/
│   └── update-modal.tsx
└── lib/
    └── ota-update.ts
```

## Implementation rules

1. Use `expo-updates`.
2. Do not use PostHog.
3. Do not use feature flags.
4. Do not use platform-specific forced-update configuration.
5. Do not show a progress banner while downloading.
6. Do not block app startup while checking or downloading.
7. Do not automatically restart the app.
8. Prevent duplicate update checks/downloads.
9. Catch update errors so an OTA failure never prevents the app from running.
10. Keep the update logic separate from the modal presentation where practical.
11. Mount the update manager from the root layout so it remains active for the lifetime of the app.

## Update lifecycle

```text
App opens / becomes active
        |
        v
Check for OTA update
        |
   +----+----+
   |         |
No update   Available
   |         |
   v         v
Continue   Download silently
normally       |
               v
        Download completes
               |
               v
       Show restart modal
               |
          +----+----+
          |         |
        Later     Restart
          |         |
          v         v
       Close     Updates.reloadAsync()
       modal          |
                      v
                 App reloads
                 with update
```

## Error behavior

Checking and downloading must be wrapped in error handling.

If either operation fails:

- Do not show the modal.
- Do not show an error screen.
- Do not block navigation.
- Keep the current app running.
- Allow another check the next time the app becomes active.

## App lifecycle

The initial check should run when the update manager mounts.

A foreground check should also run when the app transitions back to `active`.

A ref or equivalent guard should prevent concurrent checks/downloads.

## Dependencies

Required:

- `expo-updates`
- React Native

No PostHog or other remote configuration service is required.
