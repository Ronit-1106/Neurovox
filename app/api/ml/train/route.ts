import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

const execPromise = util.promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const projectRoot = process.cwd();
    // Execute training pipeline on real collected participants
    const cmd = `PYTHONPATH="${projectRoot}" python3 -m ml.train_and_export`;
    const { stdout, stderr } = await execPromise(cmd, { cwd: projectRoot, timeout: 60000 });

    const metadataPath = path.join(projectRoot, 'models', 'model_metadata.json');
    let metadata = null;
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    }

    return NextResponse.json({
      status: 'success',
      message: 'Model successfully trained on real participant features and exported to ONNX.',
      output: stdout,
      metadata,
    });
  } catch (error: any) {
    console.error('Training pipeline error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Training pipeline failed',
        stderr: error.stderr || '',
      },
      { status: 500 }
    );
  }
}
