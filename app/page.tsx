'use client';

import React, { useState, useEffect } from 'react';
import { HomeView } from '@/components/home-view';
import { NameModal } from '@/components/name-modal';
import { FaceScanner } from '@/components/face-scanner';
import { StoreView } from '@/components/store-view';
import { PaymentPortal } from '@/components/payment-portal';
import { ScanHistory } from '@/components/scan-history';
import { MaskStyle, MaskSize, FaceMeasurements, MASK_STYLES } from '@/lib/mask-fit';
import { getSavedUsername, saveUsername } from '@/lib/storage';

export type AppView = 'home' | 'scanner' | 'store' | 'payment' | 'history';

export default function MainPage() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [userName, setUserName] = useState('');

  // Scanned biometrics & sizing
  const [recommendedSize, setRecommendedSize] = useState<MaskSize | null>(null);
  const [biometrics, setBiometrics] = useState<FaceMeasurements | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);

  // Selected checkout item for Payment Portal
  const [checkoutMask, setCheckoutMask] = useState<MaskStyle | null>(null);
  const [checkoutColor, setCheckoutColor] = useState<string>('Sage Green');
  const [checkoutSize, setCheckoutSize] = useState<string>('Medium');

  // Load saved username on client mount
  useEffect(() => {
    const saved = getSavedUsername();
    if (saved) {
      setUserName(saved);
    }
  }, []);

  // 1. User clicks "Start Face Scan" on Homepage
  const handleStartScanClick = () => {
    setIsNameModalOpen(true);
  };

  // 2. User submits name in NameModal -> proceed to camera scan
  const handleNameSubmit = (enteredName: string) => {
    setUserName(enteredName);
    saveUsername(enteredName);
    setIsNameModalOpen(false);
    setCurrentView('scanner');
  };

  // 3. User selects style and clicks "Order [Mask Name]" in Scanner results
  const handleProceedToStoreFromScanner = (
    maskId: string,
    size: MaskSize,
    bio: FaceMeasurements
  ) => {
    setSelectedStyleId(maskId);
    setRecommendedSize(size);
    setBiometrics(bio);
    setCurrentView('store');
  };

  // 4. In Store, user selects color/size and clicks checkout
  const handleProceedToPayment = (mask: MaskStyle, color: string, size: string) => {
    setCheckoutMask(mask);
    setCheckoutColor(color);
    setCheckoutSize(size);
    setCurrentView('payment');
  };

  // 5. Navigation helpers
  const handleGoHome = () => {
    setCurrentView('home');
  };

  const handleOpenStore = () => {
    setCurrentView('store');
  };

  const handleOpenHistory = () => {
    setCurrentView('history');
  };

  return (
    <div className="min-h-screen bg-[#F5F2EA] text-[#2E3019]">
      {/* 1. Name Modal (opens on "Start Face Scan") */}
      <NameModal
        isOpen={isNameModalOpen}
        initialName={userName}
        onClose={() => setIsNameModalOpen(false)}
        onSubmit={handleNameSubmit}
      />

      {/* 2. Homepage View (Default initial screen) */}
      {currentView === 'home' && (
        <HomeView
          onStartScan={handleStartScanClick}
          onOpenStore={handleOpenStore}
          onOpenHistory={handleOpenHistory}
        />
      )}

      {/* 3. Camera Face Scanner View */}
      {currentView === 'scanner' && (
        <div className="min-h-screen bg-[#2A2B11] flex flex-col">
          <FaceScanner
            initialUserName={userName}
            onGoHome={handleGoHome}
            onOpenStore={handleOpenStore}
            onOpenHistory={handleOpenHistory}
            onProceedToStore={handleProceedToStoreFromScanner}
          />
        </div>
      )}

      {/* 4. E-Commerce Store View with Color & Model Customization */}
      {currentView === 'store' && (
        <StoreView
          initialSelectedStyleId={selectedStyleId}
          recommendedSize={recommendedSize}
          userName={userName}
          onGoHome={handleGoHome}
          onProceedToPayment={handleProceedToPayment}
          onStartNewScan={handleStartScanClick}
        />
      )}

      {/* 5. Payment Portal with Shipping & Payment details */}
      {currentView === 'payment' && (
        <PaymentPortal
          mask={checkoutMask || MASK_STYLES[0]}
          selectedColor={checkoutColor}
          selectedSize={checkoutSize}
          userName={userName}
          onBack={() => setCurrentView('store')}
          onGoHome={handleGoHome}
        />
      )}

      {/* 6. Scan & Order History View */}
      {currentView === 'history' && (
        <div className="min-h-screen bg-[#2A2B11] text-[#F5F2EA] flex flex-col">
          {/* Top Bar with Return Home */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between max-w-6xl w-full mx-auto">
            <button
              type="button"
              onClick={handleGoHome}
              className="px-4 py-1.5 rounded-full border border-white/20 text-xs font-semibold hover:bg-white/10 transition-colors"
            >
              ← Back to Home
            </button>
            <button
              type="button"
              onClick={handleOpenStore}
              className="px-4 py-1.5 rounded-full bg-[#AEB784] text-[#2A2B11] text-xs font-bold hover:bg-[#AEB784]/90 transition-colors"
            >
              Access Store
            </button>
          </div>
          <div className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto">
            <ScanHistory onStartNewScan={handleStartScanClick} />
          </div>
        </div>
      )}
    </div>
  );
}
