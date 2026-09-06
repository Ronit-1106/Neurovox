'use client';

export interface StoredFaceScan {
  id: string;
  sqlId?: number;
  username: string;
  recommendedSize: 'Small' | 'Medium' | 'Large';
  jawWidthCm?: number;
  faceHeightCm?: number;
  jawWidthPx?: number;
  faceHeightPx?: number;
  facialRatio?: number;
  confidence?: number;
  selectedMaskStyle?: string;
  notes?: string;
  timestamp: number; // Unix epoch ms
  expiresAt: number; // Unix epoch ms (timestamp + 30 days)
  syncedToCloud: boolean;
}

const LOCAL_STORAGE_KEY = 'neurovox_scan_history_v1';
const USERNAME_STORAGE_KEY = 'neurovox_saved_username';

// Thirty days in milliseconds
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function getSavedUsername(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(USERNAME_STORAGE_KEY) || '';
}

export function saveUsername(username: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERNAME_STORAGE_KEY, username.trim());
}

export function getLocalFaceScans(): StoredFaceScan[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed: StoredFaceScan[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to read face scans from localStorage:', err);
    return [];
  }
}

export function saveLocalFaceScan(scan: Omit<StoredFaceScan, 'id' | 'timestamp' | 'expiresAt' | 'syncedToCloud'>): StoredFaceScan {
  const now = Date.now();
  const newScan: StoredFaceScan = {
    ...scan,
    id: `scan_${now}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    expiresAt: now + THIRTY_DAYS_MS,
    syncedToCloud: false,
  };

  if (typeof window !== 'undefined') {
    const current = getLocalFaceScans();
    // Prepend newest
    const updated = [newScan, ...current];
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }
  }

  return newScan;
}

export async function syncScanToCloud(scan: StoredFaceScan, idToken?: string): Promise<StoredFaceScan> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const res = await fetch('/api/scans', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        username: scan.username,
        recommendedSize: scan.recommendedSize,
        jawWidthCm: scan.jawWidthCm,
        faceHeightCm: scan.faceHeightCm,
        jawWidthPx: scan.jawWidthPx,
        faceHeightPx: scan.faceHeightPx,
        facialRatio: scan.facialRatio,
        confidence: scan.confidence,
        selectedMaskStyle: scan.selectedMaskStyle,
        notes: scan.notes,
        deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        scan.syncedToCloud = true;
        scan.sqlId = data.data.id;

        // Update in localStorage
        if (typeof window !== 'undefined') {
          const current = getLocalFaceScans();
          const updated = current.map((item) => (item.id === scan.id ? { ...scan } : item));
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        }
      }
    }
  } catch (error) {
    console.warn('Could not sync scan to Cloud SQL:', error);
  }

  return scan;
}

export async function deleteFaceScan(scanId: string, sqlId?: number): Promise<void> {
  if (typeof window !== 'undefined') {
    const current = getLocalFaceScans();
    const updated = current.filter((s) => s.id !== scanId && (!sqlId || s.sqlId !== sqlId));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }

  if (sqlId) {
    try {
      await fetch(`/api/scans/${sqlId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Failed to delete scan from Cloud SQL:', err);
    }
  }
}

export function clearAllLocalScans(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

// Format days remaining until 30-day expiration
export function getDaysRemaining(expiresAt: number): number {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export interface StoredOrder {
  orderNumber: string;
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
  paymentMethod: string;
  status: string;
  createdAt: string;
}

const ORDERS_STORAGE_KEY = 'neurovox_saved_orders_v1';

export function getLocalOrders(): StoredOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalOrder(order: StoredOrder): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalOrders();
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([order, ...current]));
  } catch (err) {
    console.warn('Failed to save local order:', err);
  }
}
