import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const dir = path.join(process.cwd(), 'ml', 'collected_dataset');
    const indexPath = path.join(dir, 'index.json');
    let participants: any[] = [];
    if (fs.existsSync(indexPath)) {
      participants = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    }
    return NextResponse.json({
      status: 'success',
      totalParticipants: participants.length,
      participants,
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      participantId,
      consentConfirmed,
      referenceSizeLabel,
      measuredJawWidthCm,
      measuredFaceHeightCm,
      frames,
      notes,
    } = body;

    if (!participantId || !consentConfirmed || !referenceSizeLabel) {
      return NextResponse.json(
        { error: 'Missing required fields: participantId, consentConfirmed, referenceSizeLabel' },
        { status: 400 }
      );
    }

    const dir = path.join(process.cwd(), 'ml', 'collected_dataset');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const record = {
      participantId,
      consentConfirmed: Boolean(consentConfirmed),
      referenceSizeLabel,
      measuredJawWidthCm: measuredJawWidthCm || null,
      measuredFaceHeightCm: measuredFaceHeightCm || null,
      notes: notes || '',
      frameCount: (frames || []).length,
      frames: frames || [],
      collectedAt: new Date().toISOString(),
    };

    const filePath = path.join(dir, `${participantId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2));

    // Update index
    const indexPath = path.join(dir, 'index.json');
    let indexData: any[] = [];
    if (fs.existsSync(indexPath)) {
      try {
        indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      } catch {}
    }

    // Replace if exists, or append
    indexData = indexData.filter((p) => p.participantId !== participantId);
    indexData.push({
      participantId,
      referenceSizeLabel,
      frameCount: record.frameCount,
      collectedAt: record.collectedAt,
    });
    fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

    return NextResponse.json({
      status: 'success',
      message: `Participant dataset saved successfully for ${participantId}`,
      recordSummary: {
        participantId,
        frameCount: record.frameCount,
        referenceSizeLabel,
      },
    });
  } catch (error: any) {
    console.error('Error saving collected sample:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
