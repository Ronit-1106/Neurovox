'use client';

import React from 'react';
import {
  ScanFace,
  Sparkles,
  ShieldCheck,
  ShoppingBag,
  History,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { MASK_STYLES } from '@/lib/mask-fit';

interface HomeViewProps {
  onStartScan: () => void;
  onOpenStore: () => void;
  onOpenHistory: () => void;
}

export function HomeView({ onStartScan, onOpenStore, onOpenHistory }: HomeViewProps) {
  return (
    <div className="min-h-screen bg-[#F5F2EA] text-[#2E3019] flex flex-col font-sans selection:bg-[#AEB784]/40">
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-6 md:px-12 pt-6 pb-4 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#E6DFC9] border border-[#DDD6C5] flex items-center justify-center text-[#3B401F] shadow-xs">
            <ScanFace className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-[#2E3019]">
            Neurovox AI
          </span>
        </div>

        {/* Right Navigation */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          <button
            type="button"
            id="nav-store-btn"
            onClick={onOpenStore}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#5A5C27] hover:text-[#2E3019] transition-colors py-1.5 px-3 rounded-full hover:bg-[#EAE4D3] border border-transparent hover:border-[#DDD6C5] cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#3B401F]" />
            <span>Store</span>
          </button>

          <button
            type="button"
            id="nav-history-btn"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#5A5C27] hover:text-[#2E3019] transition-colors py-1.5 px-3 rounded-full hover:bg-[#EAE4D3] border border-transparent hover:border-[#DDD6C5] cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-[#3B401F]" />
            <span>History</span>
          </button>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            id="nav-new-tab-link"
            className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-[#5A5C27]/90 hover:text-[#2E3019] py-1 px-2.5 rounded-full hover:bg-[#EAE4D3]/60 transition-colors"
            title="Open application in a full browser tab"
          >
            <span>Open in Tab</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Center Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-10 pb-16 text-center max-w-4xl mx-auto w-full">
        {/* Pill Tagline */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EAE4D3] text-xs sm:text-sm font-semibold text-[#3B401F] border border-[#DDD6C5] mb-8 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#3B401F]" />
          <span>Next-Gen Face Scanning</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-[#2E3019] tracking-tight leading-[1.08] mb-6">
          Find Your Perfect <br /> Mask Fit Instantly
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-[#5A5C27] max-w-2xl mx-auto leading-relaxed mb-10">
          AI-powered face scan for accurate mask sizing. No measurements needed. <br className="hidden sm:inline" />
          Just look at the camera and let our technology do the rest.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md sm:max-w-none">
          {/* Primary CTA: Start Face Scan */}
          <button
            type="button"
            id="btn-hero-start-scan"
            onClick={onStartScan}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-[#3B401F] hover:bg-[#2E3218] active:scale-[0.98] text-[#F5F2EA] font-bold text-base shadow-lg hover:shadow-xl transition-all cursor-pointer"
          >
            <span>Start Face Scan</span>
            <ScanFace className="w-5 h-5" />
          </button>

          {/* Access Store button */}
          <button
            type="button"
            id="btn-hero-access-store"
            onClick={onOpenStore}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-[#EAE4D3] hover:bg-[#DDD6C5] active:scale-[0.98] text-[#2E3019] font-bold text-base border border-[#DDD6C5] shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#3B401F]" />
            <span>Access Store</span>
          </button>

          {/* Quick link to Scan History */}
          <button
            type="button"
            id="btn-hero-scan-history"
            onClick={onOpenHistory}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-4 rounded-full bg-transparent hover:bg-[#EAE4D3]/60 text-[#5A5C27] hover:text-[#2E3019] font-semibold text-sm border border-transparent hover:border-[#DDD6C5] transition-all cursor-pointer"
          >
            <History className="w-4 h-4 text-[#5A5C27]" />
            <span>Scan History</span>
          </button>
        </div>

        {/* Three Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16 sm:mt-20 w-full text-left">
          {/* Card 1: Real-time Tracking */}
          <div className="p-6 rounded-3xl bg-[#EBE5D5]/70 border border-[#DDD6C5] shadow-xs hover:shadow-sm transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-[#DDD6C5] flex items-center justify-center mb-4 text-[#3B401F]">
              <ScanFace className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-[#2E3019]">Real-time Tracking</h3>
            <p className="text-xs sm:text-sm text-[#5A5C27] mt-1.5 leading-relaxed">
              Instant 468-point facial mesh mapping cheekbones, jaw curve, and nose bridge contours.
            </p>
          </div>

          {/* Card 2: Instant Results */}
          <div className="p-6 rounded-3xl bg-[#EBE5D5]/70 border border-[#DDD6C5] shadow-xs hover:shadow-sm transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-[#DDD6C5] flex items-center justify-center mb-4 text-[#3B401F]">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-[#2E3019]">Instant Results</h3>
            <p className="text-xs sm:text-sm text-[#5A5C27] mt-1.5 leading-relaxed">
              Automated mask size prediction tailored specifically to your facial aspect ratio and measurements.
            </p>
          </div>

          {/* Card 3: Privacy First */}
          <div className="p-6 rounded-3xl bg-[#EBE5D5]/70 border border-[#DDD6C5] shadow-xs hover:shadow-sm transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-[#DDD6C5] flex items-center justify-center mb-4 text-[#3B401F]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-[#2E3019]">Privacy First</h3>
            <p className="text-xs sm:text-sm text-[#5A5C27] mt-1.5 leading-relaxed">
              On-device camera processing with local storage and secure 30-day encrypted retention.
            </p>
          </div>
        </div>

        {/* Compatible Mask Styles Preview */}
        <div className="w-full mt-16 text-left">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#2E3019]">
                Available Mask Collections
              </h2>
              <p className="text-xs sm:text-sm text-[#5A5C27] mt-0.5">
                Every style is customized in Small, Medium, or Large based on your face scan.
              </p>
            </div>
            <button
              type="button"
              id="btn-explore-masks-header"
              onClick={onOpenStore}
              className="text-xs font-bold text-[#3B401F] hover:underline flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-[#EAE4D3]/50"
            >
              <span>Explore All Masks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {MASK_STYLES.map((mask) => (
              <div
                key={mask.id}
                className="bg-white/80 rounded-3xl p-5 border border-[#DDD6C5] shadow-xs flex flex-col justify-between hover:border-[#3B401F]/40 transition-colors"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EAE4D3] text-[#3B401F]">
                      Seal: {mask.sealScore}
                    </span>
                    <span className="font-extrabold text-[#2E3019] text-sm">{mask.price}</span>
                  </div>
                  <h4 className="font-bold text-base text-[#2E3019]">{mask.name}</h4>
                  <p className="text-xs text-[#5A5C27] mt-1 line-clamp-2">{mask.description}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#DDD6C5] flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#5A5C27]">
                    {mask.colors.length} Color Options
                  </span>
                  <button
                    type="button"
                    id={`btn-scan-card-${mask.id}`}
                    onClick={onStartScan}
                    className="text-xs font-bold text-[#3B401F] hover:underline flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-[#EAE4D3]/60 transition-colors"
                  >
                    <span>Scan for Fit</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#DDD6C5] py-6 px-6 text-center text-xs text-[#5A5C27]">
        <p>Neurovox AI · Precision Mask Sizing & Biometric Seal Modeling · 30-Day Retention</p>
      </footer>
    </div>
  );
}
