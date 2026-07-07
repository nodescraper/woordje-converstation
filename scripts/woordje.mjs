#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const backendDir = path.join(rootDir, "backend");
const frontendDir = path.join(rootDir, "frontend");
const venvPython = path.join(backendDir, ".venv", "bin", "python");
const frontendNodeModules = path.join(frontendDir, "node_modules");
const isWindows = process.platform === "win32";
const defaultSpacyModels = (process.env.WOORDJE_SPACY_MODELS || "nl_core_news_sm en_core_web_sm de_core_news_sm")
  .split(/\s+/)
  .filter(Boolean);

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || rootDir,
      stdio: options.stdio || "inherit",
      env: { ...process.env, ...(options.env || {}) },
      shell: options.shell || false,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

function spawnLong(command, args, options = {}) {
  return spawn(command, args, {
    cwd: options.cwd || rootDir,
    stdio: "inherit",
    env: { ...process.env, ...(options.env || {}) },
    shell: options.shell || false,
  });
}

async function ensureBackend({ forceInstall = false, includeSpacy = false } = {}) {
  log("==> Checking backend");
  if (!existsSync(venvPython)) {
    log("==> Creating backend virtual environment");
    await run("python3", ["-m", "venv", ".venv"], { cwd: backendDir });
    forceInstall = true;
  }
  if (forceInstall) {
    log("==> Installing backend dependencies");
    await run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"], { cwd: backendDir });
    await run(venvPython, ["-m", "pip", "install", "-r", "requirements.txt"], { cwd: backendDir });
    if (existsSync(path.join(backendDir, "requirements-dev.txt"))) {
      await run(venvPython, ["-m", "pip", "install", "-r", "requirements-dev.txt"], { cwd: backendDir });
    }
  } else {
    log("==> Backend virtual environment already present");
  }
  if (includeSpacy) {
    log(`==> Installing spaCy models (${defaultSpacyModels.join(", ")})`);
    for (const model of defaultSpacyModels) {
      try {
        await run(venvPython, ["-m", "spacy", "download", model], { cwd: backendDir });
      } catch {
        log(`    - skipped ${model}`);
      }
    }
  }
}

async function ensureFrontend({ forceInstall = false } = {}) {
  log("==> Checking frontend");
  if (!existsSync(frontendNodeModules)) {
    log("==> Installing frontend dependencies");
    await run("npm", ["install"], { cwd: frontendDir, shell: isWindows });
    return;
  }
  if (forceInstall) {
    log("==> Refreshing frontend dependencies");
    await run("npm", ["install"], { cwd: frontendDir, shell: isWindows });
    return;
  }
  log("==> Frontend dependencies already present");
}

async function setup() {
  await ensureBackend({ forceInstall: true, includeSpacy: true });
  await ensureFrontend({ forceInstall: true });
  log("");
  log("Setup complete.");
  log("Run `./woordje dev` to start both servers.");
}

async function runBackend() {
  await ensureBackend();
  log("Backend API -> http://localhost:5001");
  const child = spawnLong(venvPython, ["app.py"], {
    cwd: backendDir,
    env: loadDotEnv(path.join(backendDir, ".env")),
  });
  child.on("exit", (code) => process.exit(code || 0));
}

async function runFrontend() {
  await ensureFrontend();
  log("Frontend -> http://localhost:5173");
  const child = spawnLong("npm", ["run", "dev"], { cwd: frontendDir, shell: isWindows });
  child.on("exit", (code) => process.exit(code || 0));
}

function loadDotEnv(dotEnvPath) {
  const env = {};
  if (!existsSync(dotEnvPath)) return env;
  const source = readFileSync(dotEnvPath, "utf8");
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function runDev() {
  await ensureBackend();
  await ensureFrontend();
  log("");
  log("Starting Woordje...");

  const backend = spawnLong(venvPython, ["app.py"], {
    cwd: backendDir,
    env: loadDotEnv(path.join(backendDir, ".env")),
  });
  const frontend = spawnLong("npm", ["run", "dev"], {
    cwd: frontendDir,
    shell: isWindows,
  });

  const children = [backend, frontend];
  let shuttingDown = false;

  const stopAll = (signal = "SIGTERM") => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const child of children) {
      if (!child.killed) child.kill(signal);
    }
  };

  process.on("SIGINT", () => {
    stopAll("SIGINT");
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    stopAll("SIGTERM");
    process.exit(0);
  });

  backend.on("exit", (code) => {
    if (!shuttingDown) {
      stopAll();
      process.exit(code || 0);
    }
  });
  frontend.on("exit", (code) => {
    if (!shuttingDown) {
      stopAll();
      process.exit(code || 0);
    }
  });
}

async function main() {
  const command = process.argv[2] || "dev";

  try {
    if (command === "setup") return await setup();
    if (command === "backend") return await runBackend();
    if (command === "frontend") return await runFrontend();
    if (command === "dev") return await runDev();
    if (command === "help" || command === "--help" || command === "-h") {
      log("woordje <command>");
      log("");
      log("Commands:");
      log("  dev       bootstrap missing dependencies and run backend + frontend");
      log("  setup     full install: backend/frontend dependencies + default spaCy models");
      log("  backend   bootstrap backend deps if needed and run the API");
      log("  frontend  bootstrap frontend deps if needed and run the UI");
      log("  help      show this message");
      return;
    }
    fail(`Unknown command: ${command}`);
  } catch (error) {
    fail(`woordje failed: ${error.message}`);
  }
}

main();
