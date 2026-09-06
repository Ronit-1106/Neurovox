import { relations } from 'drizzle-orm';
import { doublePrecision, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table storing user identity and username
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or persistent client ID
  username: text('username').notNull(),
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Face Scans table storing biometric measurements with 30-day retention
export const faceScans = pgTable('face_scans', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  username: text('username').notNull(),
  recommendedSize: text('recommended_size').notNull(), // 'Small' | 'Medium' | 'Large'
  jawWidthCm: doublePrecision('jaw_width_cm'),
  faceHeightCm: doublePrecision('face_height_cm'),
  jawWidthPx: doublePrecision('jaw_width_px'),
  faceHeightPx: doublePrecision('face_height_px'),
  facialRatio: doublePrecision('facial_ratio'),
  confidence: doublePrecision('confidence'),
  selectedMaskStyle: text('selected_mask_style'),
  deviceInfo: text('device_info'),
  notes: text('notes'),
  scanDate: timestamp('scan_date').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(), // Exact 30-day retention timestamp
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Orders table storing customer mask orders
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  userId: integer('user_id').references(() => users.id),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  maskStyle: text('mask_style').notNull(),
  maskColor: text('mask_color').notNull(),
  maskSize: text('mask_size').notNull(),
  quantity: integer('quantity').notNull().default(1),
  totalAmount: doublePrecision('total_amount').notNull(),
  shippingAddress: text('shipping_address').notNull(),
  city: text('city').notNull(),
  postalCode: text('postal_code').notNull(),
  paymentMethod: text('payment_method').notNull().default('Credit Card'),
  status: text('status').notNull().default('Confirmed'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  scans: many(faceScans),
  orders: many(orders),
}));

export const faceScansRelations = relations(faceScans, ({ one }) => ({
  user: one(users, {
    fields: [faceScans.userId],
    references: [users.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));
