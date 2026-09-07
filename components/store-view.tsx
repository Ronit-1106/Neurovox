'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Wind,
  Award,
  Check,
  ShoppingCart,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { MASK_STYLES, MaskStyle, MaskSize, MASK_SIZE_GUIDELINES } from '@/lib/mask-fit';

interface StoreViewProps {
  recommendedSize?: MaskSize | null;
  onProceedToCheckout: (item: {
    mask: MaskStyle;
    selectedSize: MaskSize;
    selectedColor: string;
    quantity: number;
  }) => void;
}

export function StoreView({ recommendedSize = 'Medium', onProceedToCheckout }: StoreViewProps) {
  const [selectedMask, setSelectedMask] = useState<MaskStyle>(MASK_STYLES[0]);
  const [selectedSize, setSelectedSize] = useState<MaskSize>(recommendedSize || 'Medium');
  const [selectedColor, setSelectedColor] = useState<string>(MASK_STYLES[0].colors[0].name);
  const [quantity, setQuantity] = useState<number>(1);

  const handleSelectMask = (mask: MaskStyle) => {
    setSelectedMask(mask);
    setSelectedColor(mask.colors[0].name);
  };

  const currentColorObj = selectedMask.colors.find((c) => c.name === selectedColor) || selectedMask.colors[0];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Recommended Sizing Banner if coming from scan */}
      {recommendedSize && (
        <div className="p-4 rounded-2xl bg-[#E3EBD7] border border-[#C2D4AB] flex flex-wrap items-center justify-between gap-3 text-xs text-[#294212] shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#4E5B31] text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-sm text-[#1E300D]">
                Biometrically Calibrated Recommendation: Size {recommendedSize}
              </span>
              <p className="text-[#3E5C1E] mt-0.5">
                {MASK_SIZE_GUIDELINES[recommendedSize]?.label} — {MASK_SIZE_GUIDELINES[recommendedSize]?.notes}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-white/80 font-bold border border-[#C2D4AB] text-[#294212]">
            Auto-Selected
          </span>
        </div>
      )}

      {/* Product Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {MASK_STYLES.map((mask) => {
          const isSelected = mask.id === selectedMask.id;
          return (
            <div
              key={mask.id}
              onClick={() => handleSelectMask(mask)}
              className={`cursor-pointer rounded-2xl p-5 transition-all duration-200 border text-left flex flex-col justify-between ${
                isSelected
                  ? 'bg-white border-[#4E5B31] shadow-md ring-2 ring-[#4E5B31]/20'
                  : 'bg-white/60 hover:bg-white/90 border-[#DCD6C8]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-[#2E3019]">{mask.name}</h3>
                    <p className="text-[11px] text-[#7C8264] mt-0.5">{mask.idealFor}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-[#2E3019]">{mask.priceFormatted}</span>
                    <span className="block text-[10px] text-[#7C8264]">incl. taxes</span>
                  </div>
                </div>

                <p className="text-xs text-[#5D6346] leading-relaxed line-clamp-3">
                  {mask.description}
                </p>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F5F2EA] text-[10px] font-medium text-[#4E5B31] border border-[#DCD6C8]">
                    <ShieldCheck className="w-3 h-3" />
                    {mask.filtrationEfficiency}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F5F2EA] text-[10px] font-medium text-[#4E5B31] border border-[#DCD6C8]">
                    <Wind className="w-3 h-3" />
                    {mask.breathabilityIndex}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#EAE5D8] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  {mask.colors.map((c) => (
                    <span
                      key={c.name}
                      className={`w-3.5 h-3.5 rounded-full border border-black/10 ${c.bgClass}`}
                    />
                  ))}
                </div>
                <span
                  className={`font-semibold flex items-center gap-1 ${
                    isSelected ? 'text-[#4E5B31]' : 'text-[#7C8264]'
                  }`}
                >
                  {isSelected ? 'Selected Model' : 'View Model'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Mask Customizer & Checkout Block */}
      <div className="p-6 md:p-8 rounded-2xl bg-white border border-[#DCD6C8] shadow-sm space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#EAE5D8]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#7C8264]">
              Custom Fit Configuration
            </span>
            <h2 className="text-2xl font-black text-[#2E3019] mt-0.5">{selectedMask.name}</h2>
            <p className="text-xs text-[#5D6346] mt-1">{selectedMask.tagline}</p>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black text-[#2E3019]">{selectedMask.priceFormatted}</div>
            <div className="text-xs text-emerald-800 font-medium">Free express delivery in India</div>
          </div>
        </div>

        {/* Size Selection */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-[#2E3019]">1. Select Mask Frame Size</label>
            <span className="text-[#5D6346]">
              Recommended for you: <strong>Size {recommendedSize}</strong>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(['Small', 'Medium', 'Large'] as MaskSize[]).map((size) => {
              const isSizeSelected = selectedSize === size;
              const isRecommended = recommendedSize === size;
              const guideline = MASK_SIZE_GUIDELINES[size];

              return (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isSizeSelected
                      ? 'bg-[#F5F2EA] border-[#4E5B31] shadow-sm ring-2 ring-[#4E5B31]/15'
                      : 'bg-white hover:bg-[#F5F2EA]/50 border-[#DCD6C8]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#2E3019]">{guideline.label}</span>
                    {isRecommended && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E3EBD7] text-[#294212]">
                        AI Matched
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#5D6346] mt-1">
                    Jaw: {guideline.recommendedJawSpan}
                  </div>
                  <div className="text-[10px] text-[#7C8264]">
                    Height: {guideline.recommendedFaceHeight}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Palette Selection */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-[#2E3019]">
            2. Choose Chassis & Trim Color
          </label>
          <div className="flex flex-wrap gap-3">
            {selectedMask.colors.map((c) => {
              const isColorSelected = selectedColor === c.name;
              return (
                <button
                  key={c.name}
                  onClick={() => setSelectedColor(c.name)}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border text-xs transition-all ${
                    isColorSelected
                      ? 'bg-[#F5F2EA] border-[#4E5B31] ring-2 ring-[#4E5B31]/15 font-bold text-[#2E3019]'
                      : 'bg-white hover:bg-[#F5F2EA]/40 border-[#DCD6C8] text-[#5D6346]'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full border border-black/20 ${c.bgClass}`} />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Technical Specifications Summary */}
        <div className="p-4 rounded-xl bg-[#F5F2EA] border border-[#DCD6C8] space-y-2 text-xs">
          <div className="font-bold text-[#2E3019] flex items-center gap-1.5">
            <Award className="w-4 h-4 text-[#4E5B31]" />
            <span>Industrial Standards & Material Compliance</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#5D6346] pt-1">
            <div>• <strong>Filtration:</strong> {selectedMask.specifications.filterType}</div>
            <div>• <strong>Seal Matrix:</strong> {selectedMask.specifications.sealMaterial}</div>
            <div>• <strong>Ergonomics:</strong> {selectedMask.specifications.strapType}</div>
            <div>• <strong>Certification:</strong> {selectedMask.specifications.certification}</div>
          </div>
        </div>

        {/* Quantity & Proceed CTA */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#EAE5D8]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#5D6346]">Quantity:</span>
            <div className="flex items-center border border-[#DCD6C8] rounded-xl bg-white overflow-hidden">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-1.5 text-sm font-bold text-[#5D6346] hover:bg-[#F5F2EA]"
              >
                -
              </button>
              <span className="px-3 py-1.5 text-xs font-bold text-[#2E3019]">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-3 py-1.5 text-sm font-bold text-[#5D6346] hover:bg-[#F5F2EA]"
              >
                +
              </button>
            </div>
            <span className="text-xs font-semibold text-[#7C8264]">
              Total: ₹{(selectedMask.priceInr * quantity).toLocaleString('en-IN')}
            </span>
          </div>

          <button
            onClick={() =>
              onProceedToCheckout({
                mask: selectedMask,
                selectedSize,
                selectedColor,
                quantity,
              })
            }
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-[#4E5B31] hover:bg-[#3E4924] text-white font-bold text-xs shadow-md transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Proceed to Checkout with Size {selectedSize}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
