'use client';

import React, { useState, useEffect } from 'react';
import { X, Database, CheckCircle2, UserCheck, AlertCircle, Save, RefreshCw, Layers } from 'lucide-react';
import { MaskSize } from '@/lib/mask-fit';

interface DatasetCollectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectedFrames?: any[];
}

export function DatasetCollectorModal({ isOpen, onClose, collectedFrames = [] }: DatasetCollectorModalProps) {
  const [participantId, setParticipantId] = useState(`PARTICIPANT_${Math.floor(100 + Math.random() * 900)}`);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [referenceSizeLabel, setReferenceSizeLabel] = useState<MaskSize>('Medium');
  const [measuredJawWidthCm, setMeasuredJawWidthCm] = useState('13.2');
  const [measuredFaceHeightCm, setMeasuredFaceHeightCm] = useState('11.8');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [retrainResult, setRetrainResult] = useState<string | null>(null);
  const [totalParticipants, setTotalParticipants] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/ml/collect-sample')
      .then((res) => res.json())
      .then((data) => {
        if (data.totalParticipants !== undefined) {
          setTotalParticipants(data.totalParticipants);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consentConfirmed) {
      setErrorMessage('Participant consent must be confirmed before recording biometric data.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setRetrainResult(null);

    try {
      const res = await fetch('/api/ml/collect-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          consentConfirmed,
          referenceSizeLabel,
          measuredJawWidthCm: parseFloat(measuredJawWidthCm) || null,
          measuredFaceHeightCm: parseFloat(measuredFaceHeightCm) || null,
          frames: collectedFrames,
          notes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSuccessMessage(`Dataset sample for ${participantId} saved with ${collectedFrames.length} frames.`);
        if (totalParticipants !== null) {
          setTotalParticipants(totalParticipants + 1);
        }
        // Generate next ID
        setParticipantId(`PARTICIPANT_${Math.floor(100 + Math.random() * 900)}`);
      } else {
        setErrorMessage(data.error || 'Failed to save participant dataset.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error saving sample');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetrain() {
    setRetraining(true);
    setRetrainResult(null);
    setErrorMessage('');
    try {
      const res = await fetch('/api/ml/train', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        const acc = (data.metadata?.evaluation?.overall_accuracy * 100).toFixed(1);
        setRetrainResult(`Model successfully retrained on real participant dataset! Test Accuracy: ${acc}% • ONNX model updated.`);
      } else {
        setErrorMessage(data.message || 'Retraining failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Retraining failed');
    } finally {
      setRetraining(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#F5F2EA] text-[#2E3019] rounded-2xl shadow-2xl border border-[#DCD6C8] overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#EAE5D8] border-b border-[#DCD6C8]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#4E5B31] text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#2E3019]">Real Dataset Collection Pipeline</h2>
              <p className="text-xs text-[#5D6346]">
                {totalParticipants !== null ? `${totalParticipants} real participants in dataset` : 'Contribute biometric frames for model training'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[#5D6346] hover:text-[#2E3019] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {retrainResult && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{retrainResult}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5D6346] mb-1">
                Participant Identifier
              </label>
              <input
                type="text"
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCD6C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#4E5B31]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5D6346] mb-1">
                Ground-Truth Reference Size
              </label>
              <select
                value={referenceSizeLabel}
                onChange={(e) => setReferenceSizeLabel(e.target.value as MaskSize)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCD6C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#4E5B31]"
              >
                <option value="Small">Small (Petite)</option>
                <option value="Medium">Medium (Standard)</option>
                <option value="Large">Large (Extended)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5D6346] mb-1">
                Manual Jaw Caliper (cm)
              </label>
              <input
                type="number"
                step="0.1"
                value={measuredJawWidthCm}
                onChange={(e) => setMeasuredJawWidthCm(e.target.value)}
                placeholder="e.g. 13.2"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCD6C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#4E5B31]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5D6346] mb-1">
                Manual Face Height (cm)
              </label>
              <input
                type="number"
                step="0.1"
                value={measuredFaceHeightCm}
                onChange={(e) => setMeasuredFaceHeightCm(e.target.value)}
                placeholder="e.g. 11.8"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCD6C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#4E5B31]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5D6346] mb-1">
              Field Notes / Environmental Conditions
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Studio lighting, neutral expression, spectacles removed"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCD6C8] bg-white focus:outline-none focus:ring-2 focus:ring-[#4E5B31]"
            />
          </div>

          <div className="p-3 rounded-lg bg-white/70 border border-[#DCD6C8] text-xs space-y-2">
            <div className="flex items-center justify-between text-[#5D6346]">
              <span>Attached Validated Frames:</span>
              <span className="font-bold text-[#2E3019]">{collectedFrames.length} frames ready</span>
            </div>
            <div className="text-[11px] text-[#7C8264]">
              Real geometric feature vectors (16 normalized features) and head-pose angles are saved with this participant record into <code className="bg-black/5 px-1 py-0.5 rounded">ml/collected_dataset/</code> for direct training pipeline ingestion.
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="p-3 rounded-lg bg-[#EAE5D8] border border-[#DCD6C8]">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#2E3019]">
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-[#C4BDB0] text-[#4E5B31] focus:ring-[#4E5B31]"
              />
              <span className="leading-snug">
                I confirm informed participant consent has been granted for anonymous biometric feature extraction and protective sizing algorithm validation.
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleRetrain}
              disabled={retraining}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-[#DCD6C8] text-[#384323] hover:bg-[#F0ECE1] disabled:opacity-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin' : ''}`} />
              <span>{retraining ? 'Retraining MLP...' : 'Retrain Model on Dataset'}</span>
            </button>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#5D6346] hover:text-[#2E3019]"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting || !consentConfirmed}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-[#4E5B31] text-white hover:bg-[#3E4924] disabled:opacity-50 transition-colors shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{submitting ? 'Recording...' : 'Record Participant Sample'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
