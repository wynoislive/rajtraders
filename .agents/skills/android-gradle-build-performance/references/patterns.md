# Android Gradle Build Performance Patterns

## Selection Notes
- Category: `quality-release`
- Best fit when the user needs build-time diagnosis, cache tuning, or CI performance guidance.
- Reach for `android-gradle-build-logic` when the real change is module structure or plugin ownership.

## Measurement Ladder
- First pass:
  Run the bundled audit script to catch obvious smell patterns cheaply.
- Configuration-time suspicion:
  Check configuration cache compatibility and task configuration avoidance.
- Execution-time suspicion:
  Use build scans or profiles to find hot tasks, test bottlenecks, or annotation-processing cost.
- CI-only slowdown:
  Separate dependency download, cache misses, test sharding, and machine provisioning from Gradle logic itself.

## Default Review Sequence
1. Decide whether the complaint is about configuration, execution, dependency resolution, tests, or CI environment.
2. Measure that phase with the narrowest tool that answers the question.
3. Remove obvious performance smells such as dynamic dependencies, eager tasks, or kapt where KSP is supported.
4. Apply one optimization, then measure again.
5. Hand off build-logic architecture only if the bottleneck is no longer primarily about build speed.

## Common Smells
- `tasks.create`, `allprojects`, `subprojects`, or eager `get()` calls during configuration.
- `buildSrc` or custom plugin logic doing expensive I/O at configuration time.
- `kapt` remaining in modules where processors already support KSP.
- Dynamic versions such as `1.+`, `latest.release`, `-SNAPSHOT`, or changing modules in default builds.

## Handoff Shortlist
- `android-gradle-build-logic`
- `android-ci-cd-release-playstore`
