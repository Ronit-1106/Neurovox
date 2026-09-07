import { NextRequest, NextResponse } from 'next/server';
import { deleteFaceScanRecord } from '@/src/db/scans';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid scan ID' },
        { status: 400 }
      );
    }

    const success = await deleteFaceScanRecord(numId);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error('Error deleting scan:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete scan' },
      { status: 500 }
    );
  }
}
