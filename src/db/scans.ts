import { getDb } from './index';
import { scans, type NewScan, type Scan } from './schema';
import { eq, and, gt, lt, desc } from 'drizzle-orm';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function createScanRecord(data: Omit<NewScan, 'expiresAt'>): Promise<Scan | null> {
  const db = getDb();
  if (!db) return null;

  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
  const [created] = await db
    .insert(scans)
    .values({
      ...data,
      expiresAt,
    })
    .returning();

  return created || null;
}

export async function getUserScans(userId: string): Promise<Scan[]> {
  const db = getDb();
  if (!db) return [];

  const now = new Date();
  const results = await db
    .select()
    .from(scans)
    .where(and(eq(scans.userId, userId), gt(scans.expiresAt, now)))
    .orderBy(desc(scans.createdAt));

  return results;
}

export async function deleteScanRecord(scanId: string, userId: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const deleted = await db
    .delete(scans)
    .where(and(eq(scans.id, scanId), eq(scans.userId, userId)))
    .returning({ id: scans.id });

  return deleted.length > 0;
}

export async function cleanupExpiredScans(): Promise<number> {
  const db = getDb();
  if (!db) return 0;

  const now = new Date();
  const deleted = await db
    .delete(scans)
    .where(lt(scans.expiresAt, now))
    .returning({ id: scans.id });

  return deleted.length;
}
