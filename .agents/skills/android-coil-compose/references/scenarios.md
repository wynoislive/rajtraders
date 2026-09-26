# Android Coil Compose Runnable Scenarios

## Happy path
- Goal: Build the Compose fixture and validate the stable image surface used in OrbitTasks.
- Command: `bash skills/android-coil-compose/scripts/run_examples.sh`

## Edge case
- Goal: Re-check list performance, placeholder behavior, and network-module assumptions after an image-loading change.
- Command: `cd examples/orbittasks-compose && ./gradlew :app:testDebugUnitTest`

## Failure recovery
- Goal: Use visual regression checks after changing image placeholders or layout.
- Command: `cd examples/orbittasks-compose && ./gradlew verifyRoborazziDebug`
