import { desc, eq } from 'drizzle-orm';
import { db } from './index';
import { orders } from './schema';
import { getOrCreateUser } from './scans';

export interface CreateOrderInput {
  orderNumber?: string;
  uid?: string;
  customerName: string;
  customerEmail: string;
  maskStyle: string;
  maskColor: string;
  maskSize: string;
  quantity: number;
  totalAmount: number;
  shippingAddress: string;
  city: string;
  postalCode: string;
  paymentMethod?: string;
}

export async function saveOrderRecord(input: CreateOrderInput) {
  try {
    let userId: number | null = null;
    if (input.uid) {
      const user = await getOrCreateUser(input.uid, input.customerName, input.customerEmail);
      if (user) {
        userId = user.id;
      }
    }

    const orderNumber =
      input.orderNumber ||
      `NVX-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const inserted = await db
      .insert(orders)
      .values({
        orderNumber,
        userId,
        customerName: input.customerName.trim(),
        customerEmail: input.customerEmail.trim(),
        maskStyle: input.maskStyle,
        maskColor: input.maskColor,
        maskSize: input.maskSize,
        quantity: input.quantity || 1,
        totalAmount: input.totalAmount,
        shippingAddress: input.shippingAddress.trim(),
        city: input.city.trim(),
        postalCode: input.postalCode.trim(),
        paymentMethod: input.paymentMethod || 'Credit Card',
        status: 'Confirmed',
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed while saving order:', error);
    throw new Error('Database query failed while creating order', { cause: error });
  }
}

export async function getOrders(customerEmail?: string) {
  try {
    if (customerEmail && customerEmail.trim().length > 0) {
      return await db
        .select()
        .from(orders)
        .where(eq(orders.customerEmail, customerEmail.trim()))
        .orderBy(desc(orders.createdAt));
    }
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  } catch (error) {
    console.error('Database query failed while fetching orders:', error);
    throw new Error('Database query failed while fetching orders', { cause: error });
  }
}
