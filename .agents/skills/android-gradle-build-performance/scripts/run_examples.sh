#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

python3 "$ROOT/skills/android-gradle-build-performance/scripts/audit_build_performance.py" "$ROOT/examples/orbittasks-compose"
python3 "$ROOT/skills/android-gradle-build-performance/scripts/audit_build_performance.py" "$ROOT/examples/orbittasks-xml"
