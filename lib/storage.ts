/**
 * Neurovox Local Storage Utility
 */

const USERNAME_KEY = 'neurovox_user_name';
const GUEST_SCANS_KEY = 'neurovox_guest_scans';

export function getSavedUsername(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(USERNAME_KEY) || '';
  } catch {
    return '';
  }
}

export function saveUsername(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (name.trim()) {
      localStorage.setItem(USERNAME_KEY, name.trim());
    } else {
      localStorage.removeItem(USERNAME_KEY);
    }
  } catch (e) {
    console.warn('LocalStorage unavailable:', e);
  }
}

export function getGuestScans(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_SCANS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGuestScan(scan: any): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getGuestScans();
    const updated = [scan, ...current].slice(0, 20);
    localStorage.setItem(GUEST_SCANS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not save guest scan:', e);
  }
}
