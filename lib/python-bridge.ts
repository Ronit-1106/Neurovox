import { spawn } from 'child_process';
import path from 'path';

export interface PythonBridgeOptions {
  timeoutMs?: number;
}

export async function runPythonEngine(
  scriptName: string,
  args: any[] = [],
  options: PythonBridgeOptions = {}
): Promise<any> {
  const timeoutMs = options.timeoutMs || 10000;
  const scriptPath = path.join(process.cwd(), 'python_engine', scriptName);

  return new Promise((resolve, reject) => {
    let resolved = false;
    const proc = spawn('python3', [scriptPath, JSON.stringify(args)], {
      env: { ...process.env, PYTHONPATH: '.' },
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill('SIGTERM');
        reject(new Error(`Python script ${scriptName} timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (resolved) return;
      resolved = true;

      if (code !== 0) {
        return reject(new Error(`Python script ${scriptName} exited with code ${code}: ${stderr}`));
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (e) {
        // Return raw text if not JSON
        resolve({ text: stdout.trim(), stderr });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });
  });
}
