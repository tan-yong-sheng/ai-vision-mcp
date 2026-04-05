import { execSync } from "node:child_process";

/**
 * Check if a binary is available in PATH
 * @param {string} binary - Binary name to check
 * @returns {boolean} True if binary is available
 */
export function binaryAvailable(binary) {
  try {
    const isWindows = process.platform === "win32";
    const command = isWindows ? `where ${binary}` : `which ${binary}`;
    execSync(command, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Spawn a child process and capture output
 * @param {string} command - Command to run
 * @param {string[]} args - Command arguments
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export async function spawnProcess(command, args) {
  return new Promise((resolve, reject) => {
    const { spawn } = await import("node:child_process");

    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: true
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({ stdout, stderr, code });
    });

    proc.on("error", (error) => {
      reject(error);
    });
  });
}
