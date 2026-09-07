import { getDb } from './index';
import { orders, type NewOrder, type Order } from './schema';
import { eq, desc } from 'drizzle-orm';

export async function createOrderRecord(data: NewOrder): Promise<Order | null> {
  const db = getDb();
  if (!db) return null;

  const [created] = await db.insert(orders).values(data).returning();
  return created || null;
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const db = getDb();
  if (!db) return [];

  return db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
}
