import { Router } from 'express';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import authGuard from '../../shared/middleware/authGuard.js';

const router = Router();

const WORKSPACE_ROOT = path.join(os.tmpdir(), 'collabforge-workspaces');

// Ensure persistent room directory exists
const getRoomWorkspaceDir = async (roomId = 'default') => {
  const safeRoomId = String(roomId).replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
  const dir = path.join(WORKSPACE_ROOT, safeRoomId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

// Spawn shell or binary with full PATH (so npm, npx, node, python3, javac, g++ work)
const runCommand = (cmd, args, cwd, stdinText = '', timeoutMs = 60000, useShell = false) =>
  new Promise((resolve) => {
    const enhancedPath = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`;
    const child = spawn(cmd, args, {
      cwd,
      shell: useShell,
      env: { ...process.env, PATH: enhancedPath, FORCE_COLOR: '0' },
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    if (stdinText) {
      child.stdin.write(stdinText);
    }
    child.stdin.end();

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ exitCode: 1, stdout, stderr: stderr || err.message });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) {
        stderr += `\n[Timed Out after ${timeoutMs}ms]`;
      }
      resolve({ exitCode: code ?? 0, stdout, stderr });
    });
  });

// Write virtual files from IDE to persistent workspace directory
const syncVirtualFilesToDisk = async (wsDir, files = []) => {
  if (!Array.isArray(files) || files.length === 0) return;

  for (const item of files) {
    const safeRelPath = item.name.replace(/^(\.\.(\/|\\|$))+/, '');
    if (!safeRelPath || safeRelPath.startsWith('node_modules')) continue;

    const fullPath = path.join(wsDir, safeRelPath);
    if (item.type === 'folder') {
      await fs.mkdir(fullPath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, item.content ?? '');
    }
  }
};

// Read workspace directory back into virtual files array (ignoring node_modules/.git internals)
const IGNORED_DIRS = new Set(['node_modules', '.git', '__pycache__']);
const IGNORED_EXTS = new Set(['.class', '.out', '.o', '.exe', '.DS_Store']);

const scanDiskToVirtualFiles = async (wsDir, currentDir = wsDir, result = []) => {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name) || entry.name === '.DS_Store') continue;
    const ext = path.extname(entry.name);
    if (IGNORED_EXTS.has(ext)) continue;

    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(wsDir, fullPath).split(path.sep).join('/');

    if (entry.isDirectory()) {
      result.push({ name: relPath, type: 'folder', content: '' });
      await scanDiskToVirtualFiles(wsDir, fullPath, result);
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath);
      // Only sync text files under 250KB into the editor state
      if (stat.size <= 250 * 1024) {
        const content = await fs.readFile(fullPath, 'utf-8').catch(() => '');
        result.push({ name: relPath, type: 'file', content });
      }
    }
  }
  return result;
};

router.post('/', authGuard, async (req, res) => {
  const {
    roomId = 'default',
    code = '',
    language = 'javascript',
    files = [],
    entryFile = '',
    stdin = '',
    command = '',
  } = req.body;

  const start = performance.now();
  const wsDir = await getRoomWorkspaceDir(roomId);

  try {
    await syncVirtualFilesToDisk(wsDir, files);

    // 1. INTERACTIVE TERMINAL SHELL MODE (npm init -y, npm i <pkg>, ls, mkdir, touch, python3, etc.)
    if (command && command.trim()) {
      const rawCmd = command.trim();

      // Block destructive host-level commands while allowing npm, node, git, python3, pip, file ops
      const forbiddenPatterns = [/rm\s+-rf\s+\//, /mkfs/, /shutdown/, /reboot/, /:(){ :|:& };:/];
      if (forbiddenPatterns.some((re) => re.test(rawCmd))) {
        return res.status(200).json({
          success: true,
          data: {
            output: '',
            stderr: 'Command blocked by sandbox security policy.',
            exitCode: 126,
            executionTimeMs: 0,
          },
        });
      }

      // 60s timeout so `npm install <package>` has plenty of time to download
      const run = await runCommand(rawCmd, [], wsDir, stdin, 60000, true);
      const updatedFiles = await scanDiskToVirtualFiles(wsDir);

      return res.status(200).json({
        success: true,
        data: {
          output: run.stdout,
          stderr: run.stderr,
          exitCode: run.exitCode,
          executionTimeMs: Math.round(performance.now() - start),
          updatedFiles,
        },
      });
    }

    // 2. RUN ACTIVE FILE MODE
    let targetFile = entryFile;
    if (!targetFile) {
      const firstCodeFile = files.find((f) => f.type !== 'folder' && !f.name.endsWith('.md'));
      targetFile = firstCodeFile ? firstCodeFile.name : 'src/main.js';
    }
    const targetFullPath = path.join(wsDir, targetFile);
    await fs.mkdir(path.dirname(targetFullPath), { recursive: true });
    if (code) {
      await fs.writeFile(targetFullPath, code);
    }

    // JavaScript (Node.js - resolves installed packages in wsDir/node_modules!)
    if (language === 'javascript') {
      const run = await runCommand('node', [targetFullPath], wsDir, stdin, 10000);
      const updatedFiles = await scanDiskToVirtualFiles(wsDir);
      return res.status(200).json({
        success: true,
        data: {
          output: run.stdout || (!run.stderr ? '(Program exited with no output)' : ''),
          stderr: run.stderr,
          exitCode: run.exitCode,
          executionTimeMs: Math.round(performance.now() - start),
          updatedFiles,
        },
      });
    }

    // Python 3
    if (language === 'python') {
      const autoHeaders = `import sys, math, heapq, itertools, collections\nfrom collections import defaultdict, Counter, deque\nfrom typing import List, Optional, Dict, Tuple, Set\n`;
      const tempPy = path.join(path.dirname(targetFullPath), `.run_${path.basename(targetFullPath)}`);
      await fs.writeFile(tempPy, `${autoHeaders}\n${code}`);
      const run = await runCommand('python3', [tempPy], wsDir, stdin, 10000);
      await fs.rm(tempPy, { force: true }).catch(() => {});

      return res.status(200).json({
        success: true,
        data: {
          output: run.stdout || (!run.stderr ? '(Program exited with no output)' : ''),
          stderr: run.stderr,
          exitCode: run.exitCode,
          executionTimeMs: Math.round(performance.now() - start),
        },
      });
    }

    // Java
    if (language === 'java') {
      const match = code.match(/class\s+([A-Za-z0-9_]+)/);
      const className = match ? match[1] : 'Main';
      const javaDir = path.dirname(targetFullPath);
      const javaFile = path.join(javaDir, `${className}.java`);

      const javaHeaders = `import java.util.*;\nimport java.util.stream.*;\nimport java.io.*;\nimport java.math.*;\n\n`;
      const finalJavaCode =
        code.includes('import java.util') || code.includes('package ')
          ? code
          : `${javaHeaders}${code}`;
      await fs.writeFile(javaFile, finalJavaCode);

      const compile = await runCommand('javac', [javaFile], javaDir, '', 10000);
      if (compile.exitCode !== 0 || compile.stderr) {
        return res.status(200).json({
          success: true,
          data: {
            output: '',
            stderr: compile.stderr,
            exitCode: compile.exitCode,
            executionTimeMs: Math.round(performance.now() - start),
          },
        });
      }

      const run = await runCommand('java', ['-cp', javaDir, className], javaDir, stdin, 10000);
      return res.status(200).json({
        success: true,
        data: {
          output: run.stdout || (!run.stderr ? '(Program exited with no output)' : ''),
          stderr: run.stderr,
          exitCode: run.exitCode,
          executionTimeMs: Math.round(performance.now() - start),
        },
      });
    }

    // C++ 17
    if (language === 'cpp') {
      const cppHeaders = `#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <map>\n#include <unordered_map>\n#include <set>\n#include <unordered_set>\n#include <queue>\n#include <stack>\n#include <deque>\n#include <cmath>\n#include <numeric>\n#include <climits>\nusing namespace std;\n\n`;
      const tempCpp = path.join(path.dirname(targetFullPath), `.run_${path.basename(targetFullPath)}`);
      await fs.writeFile(tempCpp, code.includes('#include') ? code : `${cppHeaders}${code}`);

      const outBin = path.join(wsDir, 'a.out');
      const compile = await runCommand(
        'g++',
        ['-std=c++17', tempCpp, '-I', wsDir, '-o', outBin],
        wsDir,
        '',
        10000
      );
      await fs.rm(tempCpp, { force: true }).catch(() => {});

      if (compile.exitCode !== 0 || compile.stderr) {
        return res.status(200).json({
          success: true,
          data: {
            output: '',
            stderr: compile.stderr,
            exitCode: compile.exitCode,
            executionTimeMs: Math.round(performance.now() - start),
          },
        });
      }

      const run = await runCommand(outBin, [], wsDir, stdin, 10000);
      return res.status(200).json({
        success: true,
        data: {
          output: run.stdout || (!run.stderr ? '(Program exited with no output)' : ''),
          stderr: run.stderr,
          exitCode: run.exitCode,
          executionTimeMs: Math.round(performance.now() - start),
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        output: '',
        stderr: `Unsupported language: "${language}". Supported languages are: JavaScript, Python, Java, C++.`,
        exitCode: 1,
        executionTimeMs: Math.round(performance.now() - start),
      },
    });
  } catch (err) {
    return res.status(200).json({
      success: true,
      data: {
        output: '',
        stderr: `Execution error: ${err.message}`,
        exitCode: 1,
        executionTimeMs: 0,
      },
    });
  }
});

export default router;
