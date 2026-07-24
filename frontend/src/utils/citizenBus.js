/**
 * citizenBus.js — localStorage event bus shared between Citizen, Police, Emergency tabs.
 *
 * Keys:
 *   opcrime_emergencies  — array of SOS alerts sent by citizen
 *   opcrime_live_track   — current live-tracking state (null when off)
 */

const LS_EMERGENCIES = 'opcrime_emergencies';
const LS_TRACKING    = 'opcrime_live_track';

// ── Emergency helpers ──────────────────────────────────────────────────
export function pushEmergency(data) {
  const prev    = readEmergencies();
  const updated = [{ ...data, id: `sos-${Date.now()}`, status: 'active' }, ...prev].slice(0, 30);
  localStorage.setItem(LS_EMERGENCIES, JSON.stringify(updated));
  // Dispatch a storage-like event for same-tab listeners
  window.dispatchEvent(new StorageEvent('storage', { key: LS_EMERGENCIES }));
}

export function readEmergencies() {
  try { return JSON.parse(localStorage.getItem(LS_EMERGENCIES) || '[]'); } catch { return []; }
}

export function resolveEmergency(id) {
  const updated = readEmergencies().map(e => e.id === id ? { ...e, status: 'resolved' } : e);
  localStorage.setItem(LS_EMERGENCIES, JSON.stringify(updated));
  window.dispatchEvent(new StorageEvent('storage', { key: LS_EMERGENCIES }));
}

// ── Live tracking helpers ──────────────────────────────────────────────
export function setLiveTracking(data) {
  if (data) {
    localStorage.setItem(LS_TRACKING, JSON.stringify(data));
  } else {
    localStorage.removeItem(LS_TRACKING);
  }
  window.dispatchEvent(new StorageEvent('storage', { key: LS_TRACKING }));
}

export function readLiveTracking() {
  try { return JSON.parse(localStorage.getItem(LS_TRACKING) || 'null'); } catch { return null; }
}

// ── Hook: subscribe to bus changes ────────────────────────────────────
export function subscribeToKey(key, cb) {
  const handler = (e) => { if (!e.key || e.key === key) cb(); };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export const BUS_KEYS = { EMERGENCIES: LS_EMERGENCIES, TRACKING: LS_TRACKING };
