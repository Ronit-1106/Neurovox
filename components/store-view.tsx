'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  Star,
  Check,
  ScanFace,
  ChevronRight,
  Truck,
  RotateCcw,
  Layers,
  Heart
} from 'lucide-react';
import { MASK_STYLES, MaskStyle, MaskSize } from '@/lib/mask-fit';

interface StoreViewProps {
  initialSelectedStyleId?: string | null;
  recommendedSize?: MaskSize | null;
  userName?: string;
  onGoHome: () => void;
  onProceedToPayment: (mask: MaskStyle, color: string, size: string) => void;
  onStartNewScan: () => void;
}

export function StoreView({
  initialSelectedStyleId,
  recommendedSize,
  userName,
  onGoHome,
  onProceedToPayment,
  onStartNewScan,
}: StoreViewProps) {
  const [selectedStyleId, setSelectedStyleId] = useState<string>(
    initialSelectedStyleId || MASK_STYLES[0].id
  );
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const [selectedSize, setSelectedSize] = useState<string>(
    recommendedSize || 'Medium'
  );
  const [filterCategory, setFilterCategory] = useState<'all' | 'everyday' | 'sport' | 'shield'>('all');

  const currentMask = MASK_STYLES.find((m) => m.id === selectedStyleId) || MASK_STYLES[0];
  const currentColor = currentMask.colors[selectedColorIndex] || currentMask.colors[0];

  const filteredMasks =
    filterCategory === 'all'
      ? MASK_STYLES
      : MASK_STYLES.filter((m) => m.id === filterCategory);

  const handleSelectMask = (maskId: string) => {
    setSelectedStyleId(maskId);
    setSelectedColorIndex(0);
  };

  return (
    <div className="min-h-screen bg-[#F5F2EA] text-[#2E3019] flex flex-col font-sans">
      {/* Top Header */}
      <header className="w-full border-b border-[#DDD6C5] bg-[#F5F2EA]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGoHome}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#DDD6C5] hover:bg-[#EAE4D3] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </button>
          <div className="flex items-center gap-2 font-bold text-base tracking-tight text-[#2E3019]">
            <div className="w-7 h-7 rounded-lg bg-[#E6DFC9] flex items-center justify-center text-[#3B401F]">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span>Neurovox Mask Store</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {recommendedSize ? (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAE4D3] text-xs font-semibold text-[#3B401F] border border-[#DDD6C5]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                Personalized: Size {recommendedSize} {userName ? `(${userName})` : ''}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onStartNewScan}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3B401F] text-[#F5F2EA] text-xs font-semibold hover:bg-[#2E3218] transition-colors"
            >
              <ScanFace className="w-3.5 h-3.5" />
              <span>Scan Face for Exact Fit</span>
            </button>
          )}
        </div>
      </header>

      {/* Hero Banner with Custom Fit Status */}
      <div className="w-full bg-[#EFECE1] border-b border-[#DDD6C5] px-4 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A5C27]">
              Premium Ergonomic Collection
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2E3019] tracking-tight">
              Curated Masks Built for Your Biometrics
            </h1>
            <p className="text-xs sm:text-sm text-[#5A5C27] mt-1">
              Select your favorite style, customize the color palette, and checkout with guaranteed airtight fitment.
            </p>
          </div>

          {recommendedSize ? (
            <div className="bg-white/80 rounded-2xl p-3 border border-[#DDD6C5] flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#EAE4D3] flex items-center justify-center font-extrabold text-sm text-[#3B401F]">
                {recommendedSize}
              </div>
              <div className="text-xs">
                <div className="font-bold text-[#2E3019]">Scanned Recommended Size</div>
                <div className="text-[#5A5C27]">Automatically applied to your cart</div>
              </div>
              <button
                type="button"
                onClick={onStartNewScan}
                className="text-[11px] font-semibold underline text-[#3B401F] hover:opacity-80 ml-2"
              >
                Re-scan
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Main Content Area: Featured Customizer + Mask Catalog */}
      <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10 flex-1">
        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { id: 'all', label: 'All Models' },
            { id: 'everyday', label: 'Everyday Comfort' },
            { id: 'sport', label: 'Active Sport Pro' },
            { id: 'shield', label: 'N95 Shield Plus' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                filterCategory === cat.id
                  ? 'bg-[#3B401F] text-[#F5F2EA] shadow-sm'
                  : 'bg-white/70 text-[#5A5C27] hover:text-[#2E3019] border border-[#DDD6C5]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Featured Mask Customizer Studio */}
        <div className="bg-white/90 rounded-3xl p-6 sm:p-8 border border-[#DDD6C5] shadow-lg grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Interactive Mask Visual Render */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center p-6 bg-[#F5F2EA] rounded-2xl border border-[#DDD6C5] relative overflow-hidden min-h-[320px]">
            {/* Seal Score Badge */}
            <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full border border-[#DDD6C5] flex items-center gap-1.5 text-xs font-bold text-[#3B401F] shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Seal Fit: {currentMask.sealScore}</span>
            </div>

            <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full border border-[#DDD6C5] flex items-center gap-1 text-xs font-bold text-[#2E3019] shadow-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{currentMask.rating} ({currentMask.reviewCount})</span>
            </div>

            {/* Custom SVG Render of Mask dyed in the selected color */}
            <motion.div
              key={`${currentMask.id}-${currentColor.hex}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20 }}
              className="relative w-64 h-48 sm:w-72 sm:h-56 flex items-center justify-center mt-4"
            >
              <svg viewBox="0 0 320 240" className="w-full h-full drop-shadow-xl">
                {/* Ear straps */}
                <path
                  d="M 50 120 C 15 100, 15 140, 50 160"
                  fill="none"
                  stroke="#5A5C27"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M 270 120 C 305 100, 305 140, 270 160"
                  fill="none"
                  stroke="#5A5C27"
                  strokeWidth="6"
                  strokeLinecap="round"
                />

                {/* Main Mask Body contoured polygon with gradient */}
                <path
                  d="M 160 30 C 220 32, 270 65, 270 140 C 270 185, 210 215, 160 220 C 110 215, 50 185, 50 140 C 50 65, 100 32, 160 30 Z"
                  fill={currentColor.hex}
                  stroke="#2E3019"
                  strokeWidth="2.5"
                />

                {/* Center contour fold line */}
                <path
                  d="M 160 30 Q 162 125, 160 220"
                  fill="none"
                  stroke="rgba(0,0,0,0.18)"
                  strokeWidth="2.5"
                  strokeDasharray="4,4"
                />

                {/* Upper nose bridge memory clamp */}
                <path
                  d="M 120 42 Q 160 36, 200 42"
                  fill="none"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {/* If Sport mask, render sport vent mesh */}
                {currentMask.id === 'sport' && (
                  <g>
                    <circle cx="215" cy="135" r="16" fill="#18181B" stroke="#84CC16" strokeWidth="2" />
                    <circle cx="215" cy="135" r="10" fill="#27272A" />
                    <line x1="210" y1="135" x2="220" y2="135" stroke="#84CC16" strokeWidth="1.5" />
                    <line x1="215" y1="130" x2="215" y2="140" stroke="#84CC16" strokeWidth="1.5" />
                  </g>
                )}

                {/* If Shield mask, render 5-ply badge stamp */}
                {currentMask.id === 'shield' && (
                  <text
                    x="160"
                    y="130"
                    textAnchor="middle"
                    fill="rgba(0,0,0,0.25)"
                    fontSize="13"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    N95 · NIOSH SEAL
                  </text>
                )}
              </svg>
            </motion.div>

            {/* Current Color Label */}
            <div className="mt-2 text-xs font-semibold text-[#5A5C27]">
              Current Color: <span className="text-[#2E3019] font-bold">{currentColor.name}</span>
            </div>
          </div>

          {/* Right: Customization Controls & Specifications */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A5C27]">
                  {currentMask.material}
                </span>
                <span className="text-2xl font-extrabold text-[#3B401F]">{currentMask.price}</span>
              </div>
              <h2 className="text-2xl font-bold text-[#2E3019] mt-1">{currentMask.name}</h2>
              <p className="text-xs text-[#5A5C27] mt-1 leading-relaxed">
                {currentMask.description}
              </p>
            </div>

            {/* 1. Color Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#2E3019] uppercase tracking-wider">
                Select Color: <span className="font-semibold text-[#5A5C27] normal-case">{currentColor.name}</span>
              </label>
              <div className="flex items-center gap-3">
                {currentMask.colors.map((color, idx) => {
                  const isSelected = selectedColorIndex === idx;
                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setSelectedColorIndex(idx)}
                      className={`w-9 h-9 rounded-full relative flex items-center justify-center transition-all ${
                        isSelected
                          ? 'ring-2 ring-[#3B401F] ring-offset-2 scale-110 shadow-md'
                          : 'hover:scale-105 border border-black/10'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    >
                      {isSelected && (
                        <Check
                          className={`w-4 h-4 ${
                            color.hex === '#F8FAFC' || color.hex === '#D2C5B0'
                              ? 'text-[#2E3019]'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Size Selector */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-[#2E3019] uppercase tracking-wider">
                  Select Size
                </label>
                {recommendedSize && (
                  <span className="text-[11px] font-semibold text-[#3B401F] flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Scanned recommendation: {recommendedSize}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['Small', 'Medium', 'Large'] as MaskSize[]).map((size) => {
                  const isSelected = selectedSize === size;
                  const isRecommended = recommendedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`py-2.5 px-3 rounded-xl border text-center transition-all relative ${
                        isSelected
                          ? 'border-[#3B401F] bg-[#3B401F] text-[#F5F2EA] font-bold shadow-sm'
                          : 'border-[#DDD6C5] bg-white/70 text-[#2E3019] hover:bg-white'
                      }`}
                    >
                      <div className="text-xs font-bold">{size}</div>
                      {isRecommended && (
                        <span
                          className={`text-[9px] block font-medium ${
                            isSelected ? 'text-[#E3DBBB]' : 'text-[#3B401F]'
                          }`}
                        >
                          Recommended Fit
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feature Bullets */}
            <div className="bg-[#F5F2EA] rounded-2xl p-4 border border-[#DDD6C5] space-y-1.5 text-xs text-[#5A5C27]">
              {currentMask.features.map((feat) => (
                <div key={feat} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#3B401F] shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* Order / Checkout Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onProceedToPayment(currentMask, currentColor.name, selectedSize)}
                className="w-full py-3.5 rounded-full bg-[#3B401F] hover:bg-[#2E3218] active:scale-[0.98] text-[#F5F2EA] font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Order Custom Fit {currentMask.name} — {currentMask.price}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Catalog Grid of Other Models */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[#2E3019]">Explore All Mask Models</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {filteredMasks.map((mask) => {
              const isSelected = mask.id === selectedStyleId;
              return (
                <div
                  key={mask.id}
                  className={`bg-white/80 rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#3B401F] shadow-md bg-white'
                      : 'border-[#DDD6C5] hover:border-[#3B401F]/50 shadow-sm'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EAE4D3] text-[#3B401F]">
                        {mask.sealScore} Seal
                      </span>
                      <span className="font-extrabold text-base text-[#2E3019]">{mask.price}</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-base text-[#2E3019]">{mask.name}</h4>
                      <p className="text-xs text-[#5A5C27] mt-1">{mask.tagline}</p>
                    </div>

                    {/* Color Preview Dots */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {mask.colors.map((c) => (
                        <div
                          key={c.name}
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#DDD6C5] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleSelectMask(mask.id)}
                      className={`text-xs font-bold py-1.5 px-3 rounded-full transition-all ${
                        isSelected
                          ? 'bg-[#3B401F] text-[#F5F2EA]'
                          : 'text-[#3B401F] hover:bg-[#EAE4D3]'
                      }`}
                    >
                      {isSelected ? 'Currently Customizing' : 'Select & Customize'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onProceedToPayment(mask, mask.colors[0].name, selectedSize)
                      }
                      className="text-xs font-semibold text-[#5A5C27] hover:text-[#2E3019] flex items-center gap-0.5"
                    >
                      <span>Buy Now</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
