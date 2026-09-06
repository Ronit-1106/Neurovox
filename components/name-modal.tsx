'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanFace, User, ArrowRight, X, Sparkles } from 'lucide-react';

interface NameModalProps {
  isOpen: boolean;
  initialName: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function NameModal({ isOpen, initialName, onClose, onSubmit }: NameModalProps) {
  const [name, setName] = useState(initialName || 'Ronit');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim() || 'Ronit';
    setError('');
    onSubmit(trimmed);
  };

  const handleQuickStart = () => {
    onSubmit(name.trim() || 'Guest User');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-md bg-[#F5F2EA] text-[#2E3019] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#DDD6C5]"
        >
          {/* Close button */}
          <button
            type="button"
            id="btn-close-name-modal"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-[#5A5C27] hover:text-[#2E3019] hover:bg-[#EAE4D3] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top Badge & Icon */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-[#E6DFC9] border border-[#DDD6C5] flex items-center justify-center text-[#3B401F] shadow-sm">
              <ScanFace className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAE4D3] text-[11px] font-semibold text-[#3B401F]">
                <Sparkles className="w-3 h-3 text-[#3B401F]" />
                <span>Personalized Biometrics</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#2E3019] mt-0.5">
                What should we call you?
              </h2>
            </div>
          </div>

          <p className="text-sm text-[#5A5C27] leading-relaxed mb-6">
            Enter your name to personalize your face scan, store your 30-day biometric measurements, and generate custom-fit mask recommendations.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="user-name-input" className="block text-xs font-semibold text-[#2E3019] uppercase tracking-wider mb-2">
                Your Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A5C27]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="user-name-input"
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="e.g. Ronit Raut (or leave as Ronit)"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/90 border border-[#DDD6C5] focus:border-[#3B401F] focus:ring-2 focus:ring-[#3B401F]/15 text-[#2E3019] placeholder:text-[#5A5C27]/50 font-medium text-base outline-none transition-all"
                />
              </div>
              {error && (
                <p className="text-xs text-red-600 font-medium mt-2 pl-1">
                  {error}
                </p>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                id="btn-quick-scan"
                onClick={handleQuickStart}
                className="w-full sm:w-auto flex-1 py-3 px-4 rounded-full border border-[#DDD6C5] text-sm font-semibold text-[#5A5C27] hover:bg-[#EAE4D3] transition-colors cursor-pointer"
              >
                Scan as Guest
              </button>
              <button
                type="submit"
                id="btn-submit-name"
                className="w-full sm:w-auto flex-[2] py-3 px-6 rounded-full bg-[#3B401F] hover:bg-[#2E3218] active:scale-[0.98] text-[#F5F2EA] font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Continue to Camera</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
