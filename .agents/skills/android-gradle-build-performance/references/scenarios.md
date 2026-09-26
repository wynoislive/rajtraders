# Android Gradle Build Performance Runnable Scenarios

## Happy path
- Goal: Audit the Compose fixture for obvious build-performance risks and produce a remediation report.
- Command: `python3 skills/android-gradle-build-performance/scripts/audit_build_performance.py examples/orbittasks-compose`

## Edge case
- Goal: Compare Compose and XML fixtures when one build type is slower in CI than local development.
- Command: `bash skills/android-gradle-build-performance/scripts/run_examples.sh`

## Failure recovery
- Goal: Re-audit after toggling Gradle flags to catch compatibility issues before rollout.
- Command: `python3 skills/android-gradle-build-performance/scripts/audit_build_performance.py examples/orbittasks-xml --json`
