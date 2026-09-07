import { pgTable, serial, text, timestamp, real, integer, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firebaseUid: text('firebase_uid').notNull().unique(),
  email: text('email'),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const scans = pgTable('scans', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id'), // Firebase UID or 'anonymous'
  userName: text('user_name').notNull(),
  jawWidthCm: real('jaw_width_cm').notNull(),
  faceHeightCm: real('face_height_cm').notNull(),
  faceWidthCm: real('face_width_cm'),
  referenceInterEyeCm: real('reference_inter_eye_cm').default(6.3).notNull(),
  recommendedSize: text('recommended_size').notNull(), // 'Small' | 'Medium' | 'Large'
  confidence: real('confidence').notNull(), // 0.0 - 1.0 (actual model softmax)
  scanQuality: text('scan_quality').default('Good').notNull(), // 'Excellent' | 'Good' | 'Fair' | 'Poor'
  probabilities: jsonb('probabilities').$type<{ Small: number; Medium: number; Large: number }>(),
  headPose: jsonb('head_pose').$type<{ yawDeg: number; pitchDeg: number; rollDeg: number }>(),
  stabilityMetrics: jsonb('stability_metrics').$type<{
    sampleCount: number;
    acceptedCount: number;
    rejectedCount: number;
    jawCvPercent: number;
    heightCvPercent: number;
    stabilityScore: number;
  }>(),
  normalizedFeatures: jsonb('normalized_features').$type<number[]>(),
  isDemoSimulation: boolean('is_demo_simulation').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(), // Exact 30-day retention window
});

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  scanId: uuid('scan_id').references(() => scans.id),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  shippingAddress: jsonb('shipping_address').notNull(),
  items: jsonb('items').notNull(),
  currency: text('currency').default('INR').notNull(),
  totalInr: integer('total_inr').notNull(),
  status: text('status').default('confirmed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Scan = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
