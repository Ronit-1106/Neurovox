import { NextRequest, NextResponse } from 'next/server';
import { runPythonEngine } from '@/lib/python-bridge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jawWidthCm, faceHeightCm, facialRatio } = body;

    // Run computation in Python Anthropometric Engine
    const pythonResult = await runPythonEngine<any, any>('biometrics.py', {
      jawWidthCm: Number(jawWidthCm) || 12.8,
      faceHeightCm: Number(faceHeightCm) || 12.2,
      facialRatio: facialRatio ? Number(facialRatio) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: pythonResult,
      engine: 'Python 3.10',
    });
  } catch (error: any) {
    console.error('Python Biometrics Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to analyze biometric landmarks with Python engine',
      },
      { status: 500 }
    );
  }
}
