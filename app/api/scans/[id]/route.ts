import { NextRequest, NextResponse } from 'next/server';
import { deleteFaceScanRecord } from '@/src/db/scans';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const deleted = await deleteFaceScanRecord(numericId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Scan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Scan deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting scan:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete scan' },
      { status: 500 }
    );
  }
}
