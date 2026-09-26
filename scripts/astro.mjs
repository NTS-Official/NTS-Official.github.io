#!/usr/bin/env node
// 跨平台的 astro 命令包装器。
//
// 为什么需要它：
// 1. npm 在 Windows 上用 cmd 执行 scripts，`VAR=value astro build` 这种 POSIX 前缀语法会报
//    "'VAR' is not recognized as an internal or external command"，所以不能把环境变量写进 scripts。
// 2. Astro 的遥测会在 workspace 之外（%APPDATA%\astro）建目录，在没有该权限的环境里直接崩。
// 3. 用 stdio:'inherit' 而不是管道，既让输出实时透传，也避免受限环境下管道 stdio 的 EPERM。
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const astroBin = join(root, 'node_modules', 'astro', 'astro.js');
const args = process.argv.slice(2);

const child = spawn(process.execPath, [astroBin, ...args], {
  stdio: 'inherit',
  cwd: root,
  env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
child.on('error', (err) => {
  console.error('无法启动 astro:', err.message);
  process.exit(1);
});