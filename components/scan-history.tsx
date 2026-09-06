'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  History,
  Trash2,
  CloudCheck,
  HardDrive,
  Clock,
  User,
  Search,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Layers,
  ArrowUpDown,
  ShoppingBag,
  Package
} from 'lucide-react';
import {
  StoredFaceScan,
  getLocalFaceScans,
  deleteFaceScan,
  clearAllLocalScans,
  getDaysRemaining,
  getSavedUsername,
  saveUsername,
  StoredOrder,
  getLocalOrders
} from '@/lib/storage';
import { cn } from '@/lib/utils';

interface ScanHistoryProps {
  onStartNewScan?: () => void;
}

export function ScanHistory({ onStartNewScan }: ScanHistoryProps) {
  const [activeSubTab, setActiveSubTab] = useState<'scans' | 'orders'>('scans');
  const [scans, setScans] = useState<StoredFaceScan[]>([]);
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [activeUsername, setActiveUsername] = useState('');
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);

  // Load scans and orders on mount
  const refreshScans = () => {
    const localScans = getLocalFaceScans();
    setScans(localScans);
    const localOrders = getLocalOrders();
    setOrders(localOrders);
  };

  useEffect(() => {
    const saved = getSavedUsername();
    setActiveUsername(saved);
    setSearchUsername(saved);
    refreshScans();
  }, []);

  // Fetch directly from Cloud SQL endpoint to merge
  const syncWithCloudSQL = async () => {
    setIsLoadingCloud(true);
    setCloudMessage(null);
    try {
      const url = searchUsername.trim()
        ? `/api/scans?username=${encodeURIComponent(searchUsername.trim())}`
        : '/api/scans';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // Merge with local scans
          const cloudRecords: StoredFaceScan[] = json.data.map((row: any) => ({
            id: `sql_${row.id}`,
            sqlId: row.id,
            username: row.username,
            recommendedSize: row.recommended_size as any,
            jawWidthCm: row.jaw_width_cm ? Number(row.jaw_width_cm) : undefined,
            faceHeightCm: row.face_height_cm ? Number(row.face_height_cm) : undefined,
            jawWidthPx: row.jaw_width_px ? Number(row.jaw_width_px) : undefined,
            faceHeightPx: row.face_height_px ? Number(row.face_height_px) : undefined,
            facialRatio: row.facial_ratio ? Number(row.facial_ratio) : undefined,
            confidence: row.confidence ? Number(row.confidence) : undefined,
            selectedMaskStyle: row.selected_mask_style || undefined,
            notes: row.notes || undefined,
            timestamp: new Date(row.scan_date).getTime(),
            expiresAt: new Date(row.expires_at).getTime(),
            syncedToCloud: true,
          }));

          // Merge by sqlId or timestamp
          const local = getLocalFaceScans();
          const combined = [...local];

          cloudRecords.forEach((cRec) => {
            const exists = combined.some(
              (l) => l.sqlId === cRec.sqlId || Math.abs(l.timestamp - cRec.timestamp) < 2000
            );
            if (!exists) {
              combined.push(cRec);
            } else {
              // mark as synced
              const match = combined.find(
                (l) => l.sqlId === cRec.sqlId || Math.abs(l.timestamp - cRec.timestamp) < 2000
              );
              if (match) {
                match.syncedToCloud = true;
                match.sqlId = cRec.sqlId;
              }
            }
          });

          // Sort newest first
          combined.sort((a, b) => b.timestamp - a.timestamp);
          localStorage.setItem('neurovox_scan_history_v1', JSON.stringify(combined));
          setScans(combined);
          setCloudMessage(`Synchronized ${cloudRecords.length} scans from Cloud SQL database.`);
        }
      }

      // Also sync orders
      const ordersRes = await fetch('/api/orders');
      if (ordersRes.ok) {
        const ordersJson = await ordersRes.json();
        if (ordersJson.success && Array.isArray(ordersJson.data)) {
          setOrders(ordersJson.data.map((o: any) => ({
            orderNumber: o.order_number,
            customerName: o.customer_name,
            customerEmail: o.customer_email,
            maskStyle: o.mask_style,
            maskColor: o.mask_color,
            maskSize: o.mask_size,
            quantity: o.quantity,
            totalAmount: Number(o.total_amount),
            shippingAddress: o.shipping_address,
            city: o.city,
            postalCode: o.postal_code,
            paymentMethod: o.payment_method,
            status: o.status,
            createdAt: o.created_at,
          })));
        }
      }
    } catch (err) {
      console.warn('Sync failed:', err);
      setCloudMessage('Cloud sync notice: working with local storage records.');
    } finally {
      setIsLoadingCloud(false);
      setTimeout(() => setCloudMessage(null), 4000);
    }
  };

  const handleDelete = async (id: string, sqlId?: number) => {
    await deleteFaceScan(id, sqlId);
    refreshScans();
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear your local scan history?')) {
      clearAllLocalScans();
      setScans([]);
    }
  };

  // Filtered scans
  const filteredScans = scans.filter((s) => {
    if (!searchUsername.trim()) return true;
    return s.username.toLowerCase().includes(searchUsername.trim().toLowerCase());
  });

  // Calculate stats
  const totalScans = filteredScans.length;
  const sizeCounts: Record<string, number> = {};
  filteredScans.forEach((s) => {
    sizeCounts[s.recommendedSize] = (sizeCounts[s.recommendedSize] || 0) + 1;
  });
  let mostFrequentSize = 'N/A';
  let maxCount = 0;
  Object.entries(sizeCounts).forEach(([size, count]) => {
    if (count > maxCount) {
      mostFrequentSize = size;
      maxCount = count;
    }
  });

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 text-cream">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sage/20 border border-sage/40 flex items-center justify-center">
              <History className="w-5 h-5 text-sage" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-cream">Scan History & Sizing Tracker</h2>
          </div>
          <p className="text-cream/60 text-sm mt-1">
            Local browser storage & Cloud SQL database • Direct 30-day retention window
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={syncWithCloudSQL}
            disabled={isLoadingCloud}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-white/15 hover:border-sage text-xs font-medium text-cream hover:text-sage transition-colors"
            title="Fetch latest scans from Cloud SQL database"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoadingCloud && 'animate-spin')} />
            <span>{isLoadingCloud ? 'Syncing Cloud SQL...' : 'Sync Cloud SQL'}</span>
          </button>

          {scans.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-xs font-medium text-red-200 transition-colors"
              title="Clear local scan cache"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Local</span>
            </button>
          )}

          {onStartNewScan && (
            <button
              type="button"
              onClick={onStartNewScan}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-sage text-olive-dark text-xs font-bold hover:bg-sage/90 transition-transform active:scale-95 shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>New Scan</span>
            </button>
          )}
        </div>
      </div>

      {cloudMessage && (
        <div className="mt-4 p-3 bg-sage/15 border border-sage/40 rounded-xl text-xs text-sage flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{cloudMessage}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
          <div className="text-xs text-cream/60 flex items-center gap-1.5 mb-1">
            <Layers className="w-3.5 h-3.5 text-sage" />
            <span>Total Recorded Scans</span>
          </div>
          <div className="text-2xl font-bold text-cream">{totalScans}</div>
        </div>

        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
          <div className="text-xs text-cream/60 flex items-center gap-1.5 mb-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-sage" />
            <span>Consistent Fit Size</span>
          </div>
          <div className="text-2xl font-bold text-sage">{mostFrequentSize}</div>
        </div>

        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
          <div className="text-xs text-cream/60 flex items-center gap-1.5 mb-1">
            <HardDrive className="w-3.5 h-3.5 text-sage" />
            <span>Local Storage</span>
          </div>
          <div className="text-sm font-semibold text-cream mt-1">Instant Offline Access</div>
        </div>

        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
          <div className="text-xs text-cream/60 flex items-center gap-1.5 mb-1">
            <CloudCheck className="w-3.5 h-3.5 text-sage" />
            <span>Cloud SQL Retention</span>
          </div>
          <div className="text-sm font-semibold text-sage mt-1">Direct 30-Day Window</div>
        </div>
      </div>

      {/* Sub-tab switcher: Biometric Scans vs Orders */}
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveSubTab('scans')}
          className={cn(
            'px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2',
            activeSubTab === 'scans'
              ? 'bg-sage text-olive-dark shadow-md'
              : 'bg-black/30 text-cream/70 hover:text-cream border border-white/10'
          )}
        >
          <History className="w-3.5 h-3.5" />
          <span>Biometric Scans ({filteredScans.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('orders')}
          className={cn(
            'px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2',
            activeSubTab === 'orders'
              ? 'bg-sage text-olive-dark shadow-md'
              : 'bg-black/30 text-cream/70 hover:text-cream border border-white/10'
          )}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Mask Orders ({orders.length})</span>
        </button>
      </div>

      {activeSubTab === 'scans' ? (
        <>
          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6 bg-black/20 p-3 rounded-2xl border border-white/10">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cream/40" />
              <input
                type="text"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                placeholder="Filter scans by username..."
                className="w-full pl-9 pr-4 py-2 bg-black/30 border border-white/10 rounded-xl text-xs text-cream placeholder:text-cream/40 focus:outline-none focus:border-sage transition-colors"
              />
            </div>

            {searchUsername && (
              <button
                type="button"
                onClick={() => setSearchUsername('')}
                className="text-xs text-cream/60 hover:text-cream px-2 py-1"
              >
                Clear Filter
              </button>
            )}
          </div>

          {/* Scan Records List */}
          {filteredScans.length === 0 ? (
            <div className="text-center py-16 px-4 bg-black/20 border border-white/10 rounded-3xl">
              <div className="w-14 h-14 rounded-full bg-sage/10 border border-sage/20 flex items-center justify-center mx-auto mb-3 text-sage">
                <History className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-cream">No Face Scans Found</h3>
              <p className="text-cream/60 text-xs max-w-sm mx-auto mt-1 leading-relaxed">
                {searchUsername
                  ? `No historical scans matching "${searchUsername}".`
                  : 'Complete your first face scan to start tracking your biometric contours and size recommendations.'}
              </p>
              {onStartNewScan && (
                <button
                  type="button"
                  onClick={onStartNewScan}
                  className="mt-5 px-5 py-2.5 rounded-full bg-sage text-olive-dark font-semibold text-xs hover:bg-sage/90 transition-all shadow-md"
                >
                  Start Face Scan
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredScans.map((scan) => {
                  const daysLeft = getDaysRemaining(scan.expiresAt);
                  const dateStr = new Date(scan.timestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const timeStr = new Date(scan.timestamp).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <motion.div
                      key={scan.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-black/40 border border-white/10 hover:border-white/20 rounded-2xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: User, Date, Size */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-sage/15 border border-sage/30 flex flex-col items-center justify-center text-sage font-extrabold text-lg shrink-0">
                          {scan.recommendedSize[0]}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-base text-cream flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-sage" />
                              {scan.username || 'Anonymous User'}
                            </span>

                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sage/20 text-sage border border-sage/30 uppercase">
                              Size {scan.recommendedSize}
                            </span>

                            {scan.selectedMaskStyle && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-cream/80">
                                {scan.selectedMaskStyle}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-cream/50 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {dateStr} at {timeStr}
                            </span>
                          </div>

                          {scan.notes && (
                            <p className="text-xs text-cream/70 italic mt-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5 inline-block">
                              &ldquo;{scan.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Middle: Biometrics */}
                      <div className="grid grid-cols-3 gap-2 text-xs bg-black/30 p-2.5 rounded-xl border border-white/5 md:w-72">
                        <div>
                          <div className="text-cream/40 text-[10px]">Jaw Width</div>
                          <div className="font-semibold text-cream">
                            {scan.jawWidthCm ? `${scan.jawWidthCm} cm` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-cream/40 text-[10px]">Nose-to-Chin</div>
                          <div className="font-semibold text-cream">
                            {scan.faceHeightCm ? `${scan.faceHeightCm} cm` : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-cream/40 text-[10px]">Contour Ratio</div>
                          <div className="font-semibold text-sage">
                            {scan.facialRatio ? scan.facialRatio.toFixed(2) : '—'}
                          </div>
                        </div>
                      </div>

                      {/* Right: Retention & Actions */}
                      <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                        {/* Retention Pill */}
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-[11px] text-cream/80 font-medium">
                            <Clock className="w-3 h-3 text-sage" />
                            <span>{daysLeft} days left</span>
                          </div>
                          <div className="text-[10px] text-cream/40">30-day SQL direct retention</div>
                        </div>

                        {/* Storage badges */}
                        <div className="flex items-center gap-1 text-[10px]">
                          <span
                            className="p-1.5 rounded-lg bg-black/40 border border-white/10 text-cream/70"
                            title="Saved in browser local storage"
                          >
                            <HardDrive className="w-3.5 h-3.5 text-sage" />
                          </span>
                          <span
                            className="p-1.5 rounded-lg bg-black/40 border border-white/10 text-cream/70"
                            title={scan.syncedToCloud ? 'Synced to Cloud SQL' : 'Local copy'}
                          >
                            <CloudCheck className={cn('w-3.5 h-3.5', scan.syncedToCloud ? 'text-sage' : 'text-cream/30')} />
                          </span>
                        </div>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(scan.id, scan.sqlId)}
                          className="p-2 rounded-xl text-cream/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete this scan record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </>
      ) : (
        /* Orders List */
        <div>
          {orders.length === 0 ? (
            <div className="text-center py-16 px-4 bg-black/20 border border-white/10 rounded-3xl">
              <div className="w-14 h-14 rounded-full bg-sage/10 border border-sage/20 flex items-center justify-center mx-auto mb-3 text-sage">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-cream">No Orders Yet</h3>
              <p className="text-cream/60 text-xs max-w-sm mx-auto mt-1 leading-relaxed">
                Orders placed through the payment portal will appear here and in the Cloud SQL database.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order, idx) => (
                <div
                  key={order.orderNumber || idx}
                  className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-sage/20 border border-sage/30 flex items-center justify-center text-sage">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-cream">{order.maskStyle}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sage/20 text-sage font-bold uppercase">
                          Size {order.maskSize}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-cream/80">
                          {order.maskColor}
                        </span>
                      </div>
                      <div className="text-xs text-cream/60 mt-0.5">
                        Order #{order.orderNumber} • {order.customerName} ({order.shippingAddress}, {order.city})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <div className="text-base font-bold text-sage">${Number(order.totalAmount).toFixed(2)}</div>
                      <div className="text-[10px] text-cream/50 uppercase font-mono">{order.status || 'Confirmed'}</div>
                    </div>
                    <span className="p-1.5 rounded-lg bg-black/40 border border-white/10 text-cream/70" title="Cloud SQL verified">
                      <CloudCheck className="w-4 h-4 text-sage" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
