#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT/examples/orbittasks-compose"
./gradlew :app:assembleDebug :app:testDebugUnitTest
