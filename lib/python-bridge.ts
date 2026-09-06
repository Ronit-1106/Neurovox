import { spawn } from 'child_process';
import path from 'path';

/**
 * Execute a Python script in python_engine passing JSON payload via stdin
 */
export async function runPythonEngine<TIn, TOut>(scriptName: string, inputData: TIn): Promise<TOut> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'python_engine', scriptName);
    const pyProcess = spawn('python3', [scriptPath]);

    let outputText = '';
    let errorText = '';

    pyProcess.stdout.on('data', (chunk) => {
      outputText += chunk.toString();
    });

    pyProcess.stderr.on('data', (chunk) => {
      errorText += chunk.toString();
    });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python script ${scriptName} exited with code ${code}: ${errorText}`));
      }
      try {
        const parsed = JSON.parse(outputText.trim());
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse Python JSON output: ${err} - raw: ${outputText}`));
      }
    });

    pyProcess.stdin.write(JSON.stringify(inputData));
    pyProcess.stdin.end();
  });
}
