# Android Media Files Sharing Patterns

## Selection Notes
- Category: `data-platform`
- Best fit when the request matches the trigger language in `SKILL.md` and the implementation focus is `Use modern Android file, media, picker, FileProvider, and share-sheet APIs with minimal permissions.`
- Reach for neighboring skills only after this skill has framed the main problem.

## Surface Selection Guide
- Let the user choose existing photos or videos:
  Prefer: Photo Picker.
- Let the user open or create arbitrary documents:
  Prefer: SAF contracts.
- Share app-owned files to another app:
  Prefer: `FileProvider` plus chooser.
- Receive shared content from another app:
  Prefer: explicit MIME handling and URI validation at the entry point.

## Default Review Sequence
1. Decide whether the feature is picker, open/create document, capture, or share.
2. Choose the narrowest API surface for that path.
3. Make URI ownership, MIME types, and grants explicit.
4. Validate round-trip behavior with real recipient assumptions.
5. Hand off permission-only or security-only follow-up work once the contract is stable.

## Best-Practice Notes
- `content://` is the default boundary for app-to-app file exchange.
- Share sheets and chooser intents belong to this skill; generic permission prompts do not.
- Photo Picker reduces permission pressure and should be preferred when it fits the feature.
- Temporary files used for sharing should have an intentional cleanup path.

## Handoff Shortlist
- `android-permissions-activity-results`
- `android-security-best-practices`
