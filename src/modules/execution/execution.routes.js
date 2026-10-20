import { Router } from 'express';
import vm from 'node:vm';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import authGuard from '../../shared/middleware/authGuard.js';

const router = Router();

const PISTON_RUNTIMES = {
  javascript: { language: 'javascript', version: '18.15.0', filename: 'index.js' },
  typescript: { language: 'typescript', version: '5.0.3', filename: 'index.ts' },
  python: { language: 'python', version: '3.10.0', filename: 'main.py' },
  cpp: { language: 'c++', version: '10.2.0', filename: 'main.cpp' },
  java: { language: 'java', version: '15.0.2', filename: 'Main.java' },
  go: { language: 'go', version: '1.16.2', filename: 'main.go' },
  rust: { language: 'rust', version: '1.68.2', filename: 'main.rs' },
};

// Local execution helper for Java / Python / C++ if installed on host machine
const runLocalCommand = (cmd, args, cwd) =>
  new Promise((resolve) => {
    execFile(cmd, args, { cwd, timeout: 4000 }, (error, stdout, stderr) => {
      resolve({ error, stdout: stdout || '', stderr: stderr || '' });
    });
  });

router.post('/', authGuard, async (req, res) => {
  const { code = '', language = 'javascript' } = req.body;
  const start = performance.now();

  // 1. Fast in-memory sandbox for JavaScript
  if (language === 'javascript') {
    const logs = [];
    const customConsole = {
      log: (...args) =>
        logs.push(
          args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')
        ),
      error: (...args) => logs.push('[Error] ' + args.join(' ')),
      warn: (...args) => logs.push('[Warn] ' + args.join(' ')),
    };

    try {
      const context = vm.createContext({
        console: customConsole,
        setTimeout,
        Math,
        Date,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        Map,
        Set,
      });
      vm.runInContext(code, context, { timeout: 2000 });
      const duration = Math.round(performance.now() - start);
      return res.status(200).json({
        success: true,
        data: {
          output: logs.join('\n') || '(Program exited with no output)',
          stderr: '',
          executionTimeMs: duration,
        },
      });
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      return res.status(200).json({
        success: true,
        data: {
          output: logs.join('\n'),
          stderr: err.message,
          executionTimeMs: duration,
        },
      });
    }
  }

  // 2. Local execution for Java, Python, and C++ (fast & offline-proof)
  if (['java', 'python', 'cpp'].includes(language)) {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cf-exec-'));
    try {
      if (language === 'python') {
        const file = path.join(tmpDir, 'main.py');
        await fs.writeFile(file, code);
        const { stdout, stderr, error } = await runLocalCommand('python3', [file], tmpDir);
        const duration = Math.round(performance.now() - start);
        if (!error || stderr) {
          return res.status(200).json({
            success: true,
            data: {
              output: stdout || (!stderr ? '(Program exited with no output)' : ''),
              stderr,
              executionTimeMs: duration,
            },
          });
        }
      } else if (language === 'java') {
        // Extract class name or default to Main
        const match = code.match(/class\s+([A-Za-z0-9_]+)/);
        const className = match ? match[1] : 'Main';
        const file = path.join(tmpDir, `${className}.java`);
        await fs.writeFile(file, code);

        const compile = await runLocalCommand('javac', [file], tmpDir);
        if (compile.error || compile.stderr) {
          const duration = Math.round(performance.now() - start);
          return res.status(200).json({
            success: true,
            data: { output: '', stderr: compile.stderr || compile.error.message, executionTimeMs: duration },
          });
        }

        const run = await runLocalCommand('java', ['-cp', tmpDir, className], tmpDir);
        const duration = Math.round(performance.now() - start);
        return res.status(200).json({
          success: true,
          data: {
            output: run.stdout || (!run.stderr ? '(Program exited with no output)' : ''),
            stderr: run.stderr || (run.error ? run.error.message : ''),
            executionTimeMs: duration,
          },
        });
      } else if (language === 'cpp') {
        const srcFile = path.join(tmpDir, 'main.cpp');
        const outFile = path.join(tmpDir, 'a.out');
        await fs.writeFile(srcFile, code);

        const compile = await runLocalCommand('g++', [srcFile, '-o', outFile], tmpDir);
        if (compile.error || compile.stderr) {
          const duration = Math.round(performance.now() - start);
          return res.status(200).json({
            success: true,
            data: { output: '', stderr: compile.stderr || compile.error.message, executionTimeMs: duration },
          });
        }

        const run = await runLocalCommand(outFile, [], tmpDir);
        const duration = Math.round(performance.now() - start);
        return res.status(200).json({
          success: true,
          data: {
            output: run.stdout || (!run.stderr ? '(Program exited with no output)' : ''),
            stderr: run.stderr || (run.error ? run.error.message : ''),
            executionTimeMs: duration,
          },
        });
      }
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  // 3. Fallback to Piston API for other languages (Go, Rust, TypeScript)
  const runtime = PISTON_RUNTIMES[language] || PISTON_RUNTIMES.python;
  try {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [{ name: runtime.filename, content: code }],
      }),
    });
    const result = await response.json();
    const duration = Math.round(performance.now() - start);

    const stdout = result.run?.stdout || '';
    const stderr =
      result.compile?.stderr ||
      result.run?.stderr ||
      result.message ||
      '';

    return res.status(200).json({
      success: true,
      data: {
        output: stdout || (!stderr ? '(Program exited with no output)' : ''),
        stderr,
        executionTimeMs: duration,
      },
    });
  } catch (err) {
    return res.status(200).json({
      success: true,
      data: {
        output: '',
        stderr: `Execution service error: ${err.message}`,
        executionTimeMs: 0,
      },
    });
  }
});

export default router;
