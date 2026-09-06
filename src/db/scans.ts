import { and, desc, eq, gt } from 'drizzle-orm';
import { db } from './index';
import { faceScans, users } from './schema';

export interface CreateScanInput {
  username: string;
  recommendedSize: string;
  jawWidthCm?: number;
  faceHeightCm?: number;
  jawWidthPx?: number;
  faceHeightPx?: number;
  facialRatio?: number;
  confidence?: number;
  selectedMaskStyle?: string;
  deviceInfo?: string;
  notes?: string;
  uid?: string;
  email?: string;
}

// Ensure user exists in users table
export async function getOrCreateUser(uid: string, username: string, email?: string) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      if (existing[0].username !== username && username) {
        await db.update(users).set({ username }).where(eq(users.uid, uid));
      }
      return existing[0];
    }

    const inserted = await db
      .insert(users)
      .values({
        uid,
        username,
        email: email || null,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Failed to get or create user:', error);
    throw new Error('User synchronization failed', { cause: error });
  }
}

// Save a face scan with a strict 30-day expiration retention timestamp
export async function saveFaceScanRecord(input: CreateScanInput) {
  try {
    let userId: number | null = null;

    if (input.uid) {
      const user = await getOrCreateUser(input.uid, input.username, input.email);
      if (user) {
        userId = user.id;
      }
    }

    // Direct 30 days retention: expiresAt is precisely 30 days from creation
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const inserted = await db
      .insert(faceScans)
      .values({
        userId,
        username: input.username.trim() || 'Anonymous User',
        recommendedSize: input.recommendedSize,
        jawWidthCm: input.jawWidthCm ?? null,
        faceHeightCm: input.faceHeightCm ?? null,
        jawWidthPx: input.jawWidthPx ?? null,
        faceHeightPx: input.faceHeightPx ?? null,
        facialRatio: input.facialRatio ?? null,
        confidence: input.confidence ?? 0.98,
        selectedMaskStyle: input.selectedMaskStyle ?? null,
        deviceInfo: input.deviceInfo ?? null,
        notes: input.notes ?? null,
        scanDate: now,
        expiresAt: thirtyDaysFromNow,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed while saving face scan:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// Fetch non-expired scans from the last 30 days
export async function getActiveFaceScans(username?: string) {
  try {
    const now = new Date();

    if (username && username.trim().length > 0) {
      return await db
        .select()
        .from(faceScans)
        .where(and(gt(faceScans.expiresAt, now), eq(faceScans.username, username.trim())))
        .orderBy(desc(faceScans.scanDate));
    }

    return await db
      .select()
      .from(faceScans)
      .where(gt(faceScans.expiresAt, now))
      .orderBy(desc(faceScans.scanDate));
  } catch (error) {
    console.error('Database query failed while fetching face scans:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// Delete a single scan record
export async function deleteFaceScanRecord(id: number) {
  try {
    const deleted = await db.delete(faceScans).where(eq(faceScans.id, id)).returning();
    return deleted.length > 0;
  } catch (error) {
    console.error('Database query failed while deleting face scan:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
