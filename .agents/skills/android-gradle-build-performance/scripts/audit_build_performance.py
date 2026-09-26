#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


DYNAMIC_DEP_RE = re.compile(r':(?:\+|[0-9][^"\']*\+)["\']')


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding='utf-8')
    except Exception:
        return ''


def collect_files(project: Path, suffixes: tuple[str, ...]) -> list[Path]:
    return sorted(path for path in project.rglob('*') if path.is_file() and path.suffix in suffixes)


def add_finding(findings: list[dict[str, object]], severity: str, category: str, message: str, file_path: Path | None = None) -> None:
    payload: dict[str, object] = {'severity': severity, 'category': category, 'message': message}
    if file_path is not None:
        payload['file'] = str(file_path)
    findings.append(payload)


def audit(project: Path) -> dict[str, object]:
    build_files = collect_files(project, ('.gradle', '.kts', '.properties'))
    findings: list[dict[str, object]] = []
    summary = {
        'project': str(project),
        'buildsrc_present': (project / 'buildSrc').exists(),
        'uses_kapt': False,
        'uses_ksp': False,
        'configuration_cache': False,
        'build_cache': False,
        'parallel': False,
    }

    for path in build_files:
        text = read_text(path)
        if not text:
            continue
        if 'org.gradle.configuration-cache=true' in text:
            summary['configuration_cache'] = True
        if 'org.gradle.caching=true' in text:
            summary['build_cache'] = True
        if 'org.gradle.parallel=true' in text:
            summary['parallel'] = True
        if 'kapt(' in text or 'kotlin-kapt' in text:
            summary['uses_kapt'] = True
        if 'ksp(' in text or 'com.google.devtools.ksp' in text:
            summary['uses_ksp'] = True
        if 'tasks.create(' in text or 'task ' in text:
            add_finding(findings, 'warn', 'lazy-task-configuration', 'Prefer lazy task registration over eager task creation for build performance.', path)
        if 'subprojects {' in text or 'allprojects {' in text:
            add_finding(findings, 'warn', 'global-configuration', 'Global project configuration blocks can increase configuration time.', path)
        if DYNAMIC_DEP_RE.search(text):
            add_finding(findings, 'warn', 'dynamic-dependencies', 'Dynamic dependency versions can hurt reproducibility and dependency resolution performance.', path)

    if summary['buildsrc_present']:
        add_finding(findings, 'info', 'buildsrc', 'buildSrc is present; consider convention plugins or included builds if configuration time grows.')
    if not summary['configuration_cache']:
        add_finding(findings, 'warn', 'configuration-cache', 'Configuration cache is not enabled in gradle.properties.')
    if not summary['build_cache']:
        add_finding(findings, 'warn', 'build-cache', 'Gradle build cache is not enabled in gradle.properties.')
    if not summary['parallel']:
        add_finding(findings, 'info', 'parallel', 'Parallel execution is not enabled in gradle.properties.')
    if summary['uses_kapt'] and not summary['uses_ksp']:
        add_finding(findings, 'info', 'kapt-vs-ksp', 'The project uses kapt without KSP; verify whether annotation processors can migrate to KSP.')

    return {'summary': summary, 'findings': findings}


def main() -> int:
    parser = argparse.ArgumentParser(description='Audit an Android project for common Gradle build performance issues.')
    parser.add_argument('project', type=Path)
    parser.add_argument('--json', action='store_true', help='Emit JSON instead of text')
    args = parser.parse_args()

    report = audit(args.project)
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(json.dumps(report['summary'], indent=2))
        for finding in report['findings']:
            location = f" ({finding['file']})" if 'file' in finding else ''
            print(f"- [{finding['severity']}] {finding['category']}: {finding['message']}{location}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
