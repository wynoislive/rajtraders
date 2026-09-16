import fs from 'fs';
import path from 'path';

function scanDir(dir, filter, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (['node_modules', '.git', 'dist', 'build', 'deploy', 'open-code-review', '.system_generated'].includes(entry.name)) continue;
    if (entry.isDirectory()) {
      scanDir(full, filter, callback);
    } else if (filter(full)) {
      callback(full);
    }
  }
}

const findings = [];

// 1. Audit JS / TS / TSX files
scanDir('.', f => /\.(ts|tsx|js|jsx)$/.test(f) && !f.includes('audit-rules') && !f.includes('dist'), f => {
  const content = fs.readFileSync(f, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    // TypeScript: any type without explanation
    if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      if (/:\s*any\b/.test(trimmed) && !trimmed.includes('//') && !f.includes('test') && !f.includes('generated')) {
        findings.push({
          category: 'TypeScript Types',
          severity: 'Minor',
          rule: 'Avoid using `any` type without documentation/comment',
          file: f,
          line: lineNum,
          snippet: trimmed
        });
      }
    }

    // var declarations
    if (/\bvar\s+[a-zA-Z0-9_$]+/.test(trimmed)) {
      findings.push({
        category: 'Code Quality',
        severity: 'Major',
        rule: 'Using `var` is prohibited; use `let` or `const`',
        file: f,
        line: lineNum,
        snippet: trimmed
      });
    }

    // Security: eval, new Function, document.write
    if (/\beval\s*\(/.test(trimmed)) {
      findings.push({
        category: 'Code Security',
        severity: 'Critical',
        rule: 'eval() is prohibited',
        file: f,
        line: lineNum,
        snippet: trimmed
      });
    }
    if (/\bnew\s+Function\s*\(/.test(trimmed)) {
      findings.push({
        category: 'Code Security',
        severity: 'Critical',
        rule: 'Function() constructor is prohibited',
        file: f,
        line: lineNum,
        snippet: trimmed
      });
    }
    if (/document\.write\s*\(/.test(trimmed)) {
      findings.push({
        category: 'Code Security',
        severity: 'Critical',
        rule: 'document.write() is prohibited',
        file: f,
        line: lineNum,
        snippet: trimmed
      });
    }

    // Security: innerHTML assignment
    if (/innerHTML\s*=/.test(trimmed)) {
      findings.push({
        category: 'Code Security',
        severity: 'Major',
        rule: 'Direct innerHTML assignment is dangerous; use textContent or sanitize',
        file: f,
        line: lineNum,
        snippet: trimmed
      });
    }

    // Security: Prototype modification
    if (/\b(Array|Object|String|Function)\.prototype\.[a-zA-Z0-9_$]+\s*=/.test(trimmed)) {
      findings.push({
        category: 'Code Security',
        severity: 'Critical',
        rule: 'Modifying native object prototypes is prohibited',
        file: f,
        line: lineNum,
        snippet: trimmed
      });
    }

    // Error leaking in API server
    if (f.includes('api-server') && trimmed.includes('.json(') && (trimmed.includes('error: err.message') || trimmed.includes('error: (err as any).message') || trimmed.includes('err.stack'))) {
      findings.push({
        category: 'Code Security',
        severity: 'Medium',
        rule: 'Avoid leaking internal system exception details to API clients',
        file: f,
        line: lineNum,
        snippet: trimmed
      });
    }

    // Typos
    const typoRegexes = [
      { regex: /\b(occured)\b/i, correct: 'occurred' },
      { regex: /\b(recieve)\b/i, correct: 'receive' },
      { regex: /\b(sucess)\b/i, correct: 'success' },
      { regex: /\b(seperate)\b/i, correct: 'separate' },
      { regex: /\b(definately)\b/i, correct: 'definitely' },
      { regex: /\b(initalize)\b/i, correct: 'initialize' },
    ];
    typoRegexes.forEach(({ regex, correct }) => {
      const match = trimmed.match(regex);
      if (match && !trimmed.startsWith('"') && !trimmed.startsWith("'")) {
        findings.push({
          category: 'Typographical Errors',
          severity: 'Minor',
          rule: `Typo detected: "${match[1]}" should be "${correct}"`,
          file: f,
          line: lineNum,
          snippet: trimmed
        });
      }
    });

    // Async in loops (await inside for / forEach / while)
    if (/\bfor\s*\(/.test(trimmed) && trimmed.includes('await')) {
      findings.push({
        category: 'Async Handling Standards',
        severity: 'Minor',
        rule: 'Consider Promise.all for independent async operations in loops',
        file: f,
        line: lineNum,
        snippet: trimmed
      });
    }
  });
});

// 2. Audit Kotlin files
scanDir('mobile-android', f => /\.(kt|kts)$/.test(f), f => {
  const content = fs.readFileSync(f, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

    // Non-null assertion (!!)
    if (/!!/.test(trimmed) && !trimmed.includes('//')) {
      findings.push({
        category: 'Kotlin Null Safety',
        severity: 'Major',
        rule: 'Avoid overusing `!!` (non-null assertion); prefer safe call `?.` or elvis `?:`',
        file: f,
        line: lineNum,
        snippet: trimmed
      });
    }

    // GlobalScope
    if (/GlobalScope\./.test(trimmed)) {
      findings.push({
        category: 'Kotlin Concurrency',
        severity: 'Major',
        rule: 'GlobalScope is prone to coroutine and resource leaks; use viewModelScope or structured coroutineScope',
        file: f,
        line: lineNum,
        snippet: trimmed
      });
    }

    // Resource auto-closing (FileInputStream without use or try-with-resources)
    if (/new\s+(FileInputStream|FileOutputStream|BufferedReader)/.test(trimmed) && !trimmed.includes('.use')) {
      findings.push({
        category: 'Kotlin Resource Management',
        severity: 'Medium',
        rule: 'Resource streams should use `.use { ... }` to guarantee auto-closing',
        file: f,
        line: lineNum,
        snippet: trimmed
      });
    }
  });
});

const byCat = {};
const bySev = {};
findings.forEach(f => {
  byCat[f.category] = (byCat[f.category] || 0) + 1;
  bySev[f.severity] = (bySev[f.severity] || 0) + 1;
});

console.log('=== OPEN CODE REVIEW SUMMARY ===');
console.log('Total Findings:', findings.length);
console.log('By Severity:', JSON.stringify(bySev, null, 2));
console.log('By Category:', JSON.stringify(byCat, null, 2));
console.log('\n=== DETAILED FINDINGS ===');
findings.forEach((f, i) => {
  console.log(`[${i + 1}] [${f.severity}] [${f.category}] ${f.file}:${f.line}`);
  console.log(`    Rule: ${f.rule}`);
  console.log(`    Snippet: ${f.snippet}\n`);
});

