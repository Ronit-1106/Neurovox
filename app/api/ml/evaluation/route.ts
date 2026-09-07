import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const metadataPath = path.join(process.cwd(), 'models', 'model_metadata.json');
    const weightsPath = path.join(process.cwd(), 'models', 'model_weights.json');

    if (!fs.existsSync(metadataPath)) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Model evaluation metadata not found on disk. Run training pipeline first.',
        },
        { status: 404 }
      );
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    let weights = null;
    if (fs.existsSync(weightsPath)) {
      weights = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
    }

    return NextResponse.json({
      status: 'success',
      metadata,
      weights,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', message: err.message || 'Failed to read model evaluation' },
      { status: 500 }
    );
  }
}
