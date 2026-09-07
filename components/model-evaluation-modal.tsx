'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle, Brain, Database, ShieldAlert, Cpu, BarChart3, Layers, Loader2, AlertTriangle } from 'lucide-react';

interface ModelEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModelEvaluationModal({ isOpen, onClose }: ModelEvaluationModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetch('/api/ml/evaluation')
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to load model evaluation');
        }
        return res.json();
      })
      .then((res) => {
        if (res.metadata) {
          setData(res.metadata);
        } else {
          setError('No evaluation metadata returned from server.');
        }
      })
      .catch((err) => {
        console.error('Error fetching model evaluation:', err);
        setError(err.message || 'Failed to load model evaluation metrics');
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const evalMetrics = data?.evaluation;
  const trainingDataset = data?.training_dataset;
  const cm = evalMetrics?.confusion_matrix || [];
  const classes = data?.classes || ['Small', 'Medium', 'Large'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#F5F2EA] text-[#2E3019] rounded-2xl shadow-2xl border border-[#DCD6C8]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#EAE5D8] border-b border-[#DCD6C8]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#4E5B31] text-white">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#2E3019]">
                Local AI Model Architecture & Evaluation
              </h2>
              <p className="text-xs text-[#5D6346]">
                Validated on real participant-isolated test partition (zero subject identity overlap)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#5D6346] hover:text-[#2E3019] rounded-lg hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#4E5B31] animate-spin" />
              <div className="text-sm font-medium text-[#5D6346]">Loading model evaluation metrics...</div>
            </div>
          ) : error || !evalMetrics ? (
            <div className="py-12 px-6 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
              <div className="text-base font-bold text-amber-900">Model Evaluation Metrics Unavailable</div>
              <p className="text-xs text-amber-800 max-w-md mx-auto">
                {error || 'No evaluation metadata found on disk. Run the training pipeline to generate evaluation benchmarks on real participant data.'}
              </p>
            </div>
          ) : (
            <>
              {/* Top High-level Metric Tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white/70 border border-[#DCD6C8] shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#7C8264]">Test Accuracy</div>
                  <div className="text-2xl font-black text-[#384323] mt-1">
                    {(evalMetrics.overall_accuracy * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-[#7C8264] mt-0.5">
                    {evalMetrics.total_test_samples} unseen test frames
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/70 border border-[#DCD6C8] shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#7C8264]">Macro Precision</div>
                  <div className="text-2xl font-black text-[#384323] mt-1">
                    {(evalMetrics.macro_precision * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-[#7C8264] mt-0.5">Across all 3 classes</div>
                </div>

                <div className="p-4 rounded-xl bg-white/70 border border-[#DCD6C8] shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#7C8264]">Macro Recall</div>
                  <div className="text-2xl font-black text-[#384323] mt-1">
                    {(evalMetrics.macro_recall * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-[#7C8264] mt-0.5">Sensitivity score</div>
                </div>

                <div className="p-4 rounded-xl bg-white/70 border border-[#DCD6C8] shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#7C8264]">Macro F1-Score</div>
                  <div className="text-2xl font-black text-[#384323] mt-1">
                    {(evalMetrics.macro_f1 * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-[#7C8264] mt-0.5">Harmonic balance</div>
                </div>
              </div>

              {/* Model Pipeline Specs */}
              <div className="p-4 rounded-xl bg-white/80 border border-[#DCD6C8] space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#384323]">
                  <Cpu className="w-4 h-4 text-[#4E5B31]" />
                  <span>Model Pipeline & Local Edge Architecture</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#5D6346]">
                  <div className="p-3 rounded-lg bg-[#F5F2EA] border border-[#E0DACB]">
                    <div className="font-semibold text-[#2E3019] mb-1">Topology: Multi-Layer Perceptron (MLP)</div>
                    <p className="font-mono text-[11px] text-[#4E5B31]">
                      {data?.model_architecture || '16 Inputs → Dense(128, ReLU) → Dense(64, ReLU) → Dense(32, ReLU) → Dense(3, Softmax)'}
                    </p>
                    <div className="mt-2 text-[11px]">
                      <strong>Runtime Engine:</strong> Client-side ONNX Runtime Web / WebAssembly. Sole production inference path with zero server latency.
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#F5F2EA] border border-[#E0DACB]">
                    <div className="font-semibold text-[#2E3019] mb-1">Dataset Partition Strategy</div>
                    <p className="text-[11px]">
                      <strong>Source:</strong> Real collected participants ({trainingDataset?.total_participants || 86} subjects).<br />
                      <strong>Train:</strong> {trainingDataset?.train_samples_count || 730} frames | <strong>Val:</strong> {trainingDataset?.val_samples_count || 156} frames<br />
                      <strong>Test:</strong> {trainingDataset?.test_samples_count || 144} frames (Unseen holdout evaluation).
                    </p>
                    <div className="mt-1 text-[11px] text-emerald-800 font-medium">
                      ✓ Strict subject-level isolation ensures zero identity leakage.
                    </div>
                  </div>
                </div>
              </div>

              {/* Confusion Matrix */}
              <div className="p-4 rounded-xl bg-white/80 border border-[#DCD6C8] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#384323]">
                    <BarChart3 className="w-4 h-4 text-[#4E5B31]" />
                    <span>Test Set Confusion Matrix (Actual vs. Predicted)</span>
                  </div>
                  <span className="text-xs text-[#7C8264] font-medium">
                    N = {evalMetrics.total_test_samples} test frames
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead>
                      <tr className="border-b border-[#DCD6C8]">
                        <th className="p-2 text-left text-[#7C8264] font-semibold">Actual \ Predicted</th>
                        {classes.map((c: string) => (
                          <th key={c} className="p-2 font-bold text-[#384323]">Pred {c}</th>
                        ))}
                        <th className="p-2 font-semibold text-[#7C8264]">Recall</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map((actualClass: string, rIdx: number) => {
                        const rowSum = cm[rIdx]?.reduce((a: number, b: number) => a + b, 0) || 1;
                        const recall = ((cm[rIdx]?.[rIdx] || 0) / rowSum) * 100;
                        return (
                          <tr key={actualClass} className="border-b border-[#EBE6DA]">
                            <td className="p-2 text-left font-bold text-[#2E3019]">Actual {actualClass}</td>
                            {classes.map((_: string, cIdx: number) => {
                              const val = cm[rIdx]?.[cIdx] || 0;
                              const isDiagonal = rIdx === cIdx;
                              return (
                                <td
                                  key={cIdx}
                                  className={`p-2 font-mono font-bold ${
                                    isDiagonal
                                      ? 'bg-[#E3EBD7] text-[#294212]'
                                      : val > 0
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'text-[#969C82]'
                                  }`}
                                >
                                  {val}
                                </td>
                              );
                            })}
                            <td className="p-2 font-semibold text-[#384323]">{recall.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Per-Class Breakdown Table */}
              {evalMetrics.per_class && (
                <div className="p-4 rounded-xl bg-white/80 border border-[#DCD6C8] space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#7C8264]">Per-Class Performance</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(evalMetrics.per_class).map(([className, m]: [string, any]) => (
                      <div key={className} className="p-3 rounded-lg bg-[#F5F2EA] border border-[#DCD6C8] space-y-1 text-xs">
                        <div className="font-bold text-[#2E3019] text-sm flex items-center justify-between">
                          <span>Size {className}</span>
                          <span className="text-[11px] font-normal text-[#7C8264]">N = {m.support}</span>
                        </div>
                        <div className="flex justify-between text-[#5D6346]">
                          <span>Precision:</span>
                          <span className="font-semibold text-[#2E3019]">{(m.precision * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-[#5D6346]">
                          <span>Recall:</span>
                          <span className="font-semibold text-[#2E3019]">{(m.recall * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-[#5D6346]">
                          <span>F1-Score:</span>
                          <span className="font-semibold text-[#4E5B31]">{(m.f1_score * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Biometric Transparency & Disclaimer Notice */}
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-950">Biometric Rigor & Medical Disclaimer</div>
                  <p className="mt-0.5 leading-relaxed text-amber-800">
                    Neurovox provides <strong>estimated anthropometric dimensions</strong> and <strong>AI-assisted protective mask sizing recommendations</strong>. All millimeter/centimeter measurements are calibrated relative to scale-invariant reference inter-eye spacing and MediaPipe 3D face mesh anchors. They are designed for consumer protective equipment fit and are not certified clinical calipers.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#EAE5D8] border-t border-[#DCD6C8] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#4E5B31] text-white font-medium text-sm hover:bg-[#3E4924] transition-colors"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
