import { NextRequest, NextResponse } from 'next/server';
import { getActiveFaceScans, saveFaceScanRecord } from '@/src/db/scans';
import { adminAuth } from '@/lib/firebase-admin';
import { runPythonEngine } from '@/lib/python-bridge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username') || undefined;

    const scans = await getActiveFaceScans(username);
    return NextResponse.json({ success: true, data: scans });
  } catch (error: any) {
    console.error('Error fetching face scans:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch face scans' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let uid: string | undefined = undefined;
    let email: string | undefined = undefined;

    // Optional Firebase token verification
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        uid = decodedToken.uid;
        email = decodedToken.email;
      } catch (authErr) {
        console.warn('Optional auth token invalid or expired:', authErr);
      }
    }

    if (!body.recommendedSize) {
      return NextResponse.json(
        { success: false, error: 'recommendedSize is required' },
        { status: 400 }
      );
    }

    const username = body.username?.trim() || 'Anonymous User';

    let recommendedSize = body.recommendedSize;
    let confidence = body.confidence ? Number(body.confidence) : undefined;
    let facialRatio = body.facialRatio ? Number(body.facialRatio) : undefined;

    // Run calculation through Python 3.10 Anthropometric Engine
    if (body.jawWidthCm && body.faceHeightCm) {
      try {
        const pyResult = await runPythonEngine<any, any>('biometrics.py', {
          jawWidthCm: Number(body.jawWidthCm),
          faceHeightCm: Number(body.faceHeightCm),
          facialRatio: facialRatio,
        });
        if (pyResult?.recommendedSize) {
          recommendedSize = pyResult.recommendedSize;
        }
        if (pyResult?.fitConfidence) {
          confidence = pyResult.fitConfidence;
        }
        if (pyResult?.facialRatio) {
          facialRatio = pyResult.facialRatio;
        }
      } catch (pyErr) {
        console.warn('Python biometrics engine note:', pyErr);
      }
    }

    const savedRecord = await saveFaceScanRecord({
      username,
      recommendedSize,
      jawWidthCm: body.jawWidthCm ? Number(body.jawWidthCm) : undefined,
      faceHeightCm: body.faceHeightCm ? Number(body.faceHeightCm) : undefined,
      jawWidthPx: body.jawWidthPx ? Number(body.jawWidthPx) : undefined,
      faceHeightPx: body.faceHeightPx ? Number(body.faceHeightPx) : undefined,
      facialRatio,
      confidence,
      selectedMaskStyle: body.selectedMaskStyle,
      deviceInfo: body.deviceInfo,
      notes: body.notes,
      uid,
      email,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...savedRecord,
        processedBy: 'Python 3.10 Engine + Cloud SQL',
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving face scan:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save face scan' },
      { status: 500 }
    );
  }
}
