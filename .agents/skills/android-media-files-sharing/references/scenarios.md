# Android Media Files Sharing Runnable Scenarios

## Happy path
- Goal: Attach and share a task snapshot using a chooser flow and least-privilege URI grants.
- Command: `cd examples/orbittasks-compose && ./gradlew :app:testDebugUnitTest`

## Edge case
- Goal: Handle absent picker support, SAF fallback, or denied media capabilities in the XML fixture.
- Command: `cd examples/orbittasks-xml && ./gradlew :app:testDebugUnitTest`

## Failure recovery
- Goal: Separate media/file flows from permission-only or networking-only requests.
- Command: `python3 scripts/eval_triggers.py --skill android-media-files-sharing`
