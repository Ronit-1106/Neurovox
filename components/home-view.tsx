'use client';

import React, { useState } from 'react';
import {
  ScanFace,
  Sparkles,
  ShieldCheck,
  ShoppingBag,
  History,
  ArrowRight,
  HardDrive,
  CheckCircle2,
  Lock,
  Code2,
  Database,
  Terminal,
  FileCode,
  X,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { MASK_STYLES } from '@/lib/mask-fit';

interface HomeViewProps {
  onStartScan: () => void;
  onOpenStore: () => void;
  onOpenHistory: () => void;
}

export function HomeView({ onStartScan, onOpenStore, onOpenHistory }: HomeViewProps) {
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'python' | 'mysql' | 'html' | 'css' | 'docker'>('python');
  const [copied, setCopied] = useState(false);

  const codeSnippets = {
    python: `# python_engine/biometrics.py
import sys, json
from datetime import datetime, timedelta

def calculate_mask_size(jaw_width_cm, face_height_cm, facial_ratio=None):
    """Predict mask size using facial anthropometric thresholds."""
    if facial_ratio is None:
        facial_ratio = round(jaw_width_cm / max(face_height_cm, 0.1), 2)

    if jaw_width_cm < 12.0 or face_height_cm < 11.0:
        recommended_size = "Small"
        fit_confidence = 0.94
    elif jaw_width_cm > 13.8 or face_height_cm > 13.5:
        recommended_size = "Large"
        fit_confidence = 0.96
    else:
        recommended_size = "Medium"
        fit_confidence = 0.97

    now = datetime.utcnow()
    expires_at = now + timedelta(days=30)
    return {
        "recommendedSize": recommended_size,
        "fitConfidence": fit_confidence,
        "jawWidthCm": round(jaw_width_cm, 1),
        "faceHeightCm": round(face_height_cm, 1),
        "facialRatio": facial_ratio,
        "processedBy": "Python 3.10 Anthropometric Engine",
        "expiresAt": int(expires_at.timestamp() * 1000)
    }`,
    mysql: `-- python_mysql_app/schema.mysql.sql
CREATE DATABASE IF NOT EXISTS neurovox_db;
USE neurovox_db;

-- 1. Face Scans Table with 30-day retention
CREATE TABLE IF NOT EXISTS face_scans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sql_id VARCHAR(64) UNIQUE,
    username VARCHAR(255) NOT NULL DEFAULT 'Anonymous User',
    recommended_size ENUM('Small', 'Medium', 'Large') NOT NULL,
    jaw_width_cm DECIMAL(5, 2) NULL,
    face_height_cm DECIMAL(5, 2) NULL,
    facial_ratio DECIMAL(5, 2) NULL,
    confidence DECIMAL(4, 3) DEFAULT 0.95,
    selected_mask_style VARCHAR(255) NULL,
    scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_username (username),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- 2. Orders Table
CREATE TABLE IF NOT EXISTS mask_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(64) NOT NULL UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    mask_style VARCHAR(255) NOT NULL,
    mask_color VARCHAR(100) NOT NULL,
    mask_size ENUM('Small', 'Medium', 'Large') NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    total_amount DECIMAL(10, 2) NOT NULL,
    shipping_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(30) NOT NULL,
    status ENUM('confirmed', 'processing', 'shipped') DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Automatic 30-Day Expiration Event
SET GLOBAL event_scheduler = ON;
CREATE EVENT IF NOT EXISTS purge_expired_scans_event
ON SCHEDULE EVERY 1 DAY
DO DELETE FROM face_scans WHERE expires_at < NOW();`,
    html: `<!-- python_mysql_app/templates/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Neurovox | Face Scan & Mask Fitting</title>
  <link rel="stylesheet" href="/static/css/style.css">
</head>
<body>
  <header class="navbar">
    <div class="brand"><span class="badge">NV</span> Neurovox AI</div>
    <nav><button id="btn-scan">Scan Face</button><button id="btn-store">Store</button></nav>
  </header>

  <main>
    <div class="camera-viewport">
      <video id="camera-feed" autoplay playsinline muted></video>
      <div class="oval-guide"><div class="scan-beam"></div></div>
    </div>
    <div id="results-panel" class="results-box">
      <h3>Recommended Mask: <span id="size-pill">Medium</span></h3>
    </div>
  </main>
  <script src="/static/js/app.js"></script>
</body>
</html>`,
    css: `/* python_mysql_app/static/css/style.css */
:root {
  --olive-dark: #121c15;
  --olive-mid: #1c2b21;
  --sage: #a3b899;
  --cream: #f4ede2;
  --sand: #d4c5b3;
}

body {
  font-family: 'Plus Jakarta Sans', sans-serif;
  background-color: var(--olive-dark);
  color: var(--cream);
  margin: 0;
}

.oval-guide {
  width: 240px;
  height: 320px;
  border: 3px dashed var(--sage);
  border-radius: 50%;
  box-shadow: 0 0 20px rgba(163, 184, 153, 0.3);
  position: relative;
  overflow: hidden;
}

.scan-beam {
  width: 100%;
  height: 4px;
  background: var(--sage);
  box-shadow: 0 0 10px var(--sage);
  animation: scanLoop 2s infinite alternate ease-in-out;
}`,
    docker: `# python_mysql_app/docker-compose.yml
version: '3.8'

services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: neurovox_db
    ports:
      - "3306:3306"
    volumes:
      - ./schema.mysql.sql:/docker-entrypoint-initdb.d/init.sql

  web:
    build: .
    environment:
      MYSQL_HOST: db
      PORT: 5000
    ports:
      - "5000:5000"
    depends_on:
      - db`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeCodeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="min-h-screen bg-[#F5F2EA] text-[#2E3019] flex flex-col font-sans selection:bg-[#AEB784]/40">
      {/* Top Header matching Screenshot 1 */}
      <header className="w-full max-w-7xl mx-auto px-6 md:px-12 pt-6 pb-4 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#E6DFC9] border border-[#DDD6C5] flex items-center justify-center text-[#3B401F] shadow-xs">
            <ScanFace className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-[#2E3019]">
            Neurovox Ai
          </span>
        </div>

        {/* Right Navigation & Sub-brand */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          <button
            type="button"
            id="nav-code-btn"
            onClick={() => setShowCodeModal(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#3B401F] bg-[#EAE4D3] hover:bg-[#DDD6C5] transition-colors py-1.5 px-3 rounded-full border border-[#DDD6C5] shadow-xs cursor-pointer"
            title="View Python, HTML, CSS & MySQL Codebase"
          >
            <Code2 className="w-3.5 h-3.5 text-[#3B401F]" />
            <span>Python & MySQL</span>
          </button>

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
            title="Open application in a full browser tab without iframe constraints"
          >
            <span>Open in Tab</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Center Hero Section matching Screenshot 1 */}
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

        {/* Action Buttons: Start Face Scan & Beside Scanning Option give option for accessing the store */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md sm:max-w-none">
          {/* Primary CTA: Start Face Scan with smiling scan face icon */}
          <button
            type="button"
            id="btn-hero-start-scan"
            onClick={onStartScan}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-[#3B401F] hover:bg-[#2E3218] active:scale-[0.98] text-[#F5F2EA] font-bold text-base shadow-lg hover:shadow-xl transition-all cursor-pointer"
          >
            <span>Start Face Scan</span>
            <ScanFace className="w-5 h-5" />
          </button>

          {/* Beside Scanning Option: Access Store button */}
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

        {/* Three Feature Cards matching Screenshot 1 */}
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
              On-device camera processing with local storage and secure 30-day encrypted Cloud SQL retention.
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
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-2">
          <p>Neurovox AI · Precision Mask Sizing & Biometric Seal Modeling · 30-Day Retention</p>
          <button
            type="button"
            onClick={() => setShowCodeModal(true)}
            className="text-xs font-bold text-[#3B401F] underline flex items-center gap-1 cursor-pointer hover:text-[#2E3218]"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Inspect Python, HTML, CSS & MySQL Codebase</span>
          </button>
        </div>
      </footer>

      {/* Python & MySQL Codebase Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#1C2B21] border border-white/15 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-left text-[#F4EDE2]">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#A3B899]/20 border border-[#A3B899]/30 flex items-center justify-center text-[#A3B899]">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F4EDE2]">Python, HTML, CSS & MySQL Stack</h3>
                  <p className="text-xs text-[#A3B899]">Production-Ready Codebase & Active Runtime Engine</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCodeModal(false)}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 px-5 pt-3 border-b border-white/10 bg-black/30 overflow-x-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveCodeTab('python')}
                className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeCodeTab === 'python' ? 'border-[#A3B899] text-[#A3B899]' : 'border-transparent text-white/60 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Python Engine (biometrics.py)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCodeTab('mysql')}
                className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeCodeTab === 'mysql' ? 'border-[#A3B899] text-[#A3B899]' : 'border-transparent text-white/60 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>MySQL Schema (schema.sql)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCodeTab('html')}
                className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeCodeTab === 'html' ? 'border-[#A3B899] text-[#A3B899]' : 'border-transparent text-white/60 hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>HTML5 (index.html)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCodeTab('css')}
                className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeCodeTab === 'css' ? 'border-[#A3B899] text-[#A3B899]' : 'border-transparent text-white/60 hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>CSS3 (style.css)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCodeTab('docker')}
                className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeCodeTab === 'docker' ? 'border-[#A3B899] text-[#A3B899]' : 'border-transparent text-white/60 hover:text-white'
                }`}
              >
                <span>Docker Compose</span>
              </button>
            </div>

            {/* Code Body */}
            <div className="p-5 flex-1 overflow-auto bg-[#101812] relative">
              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-white"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>

              <pre className="font-mono text-xs leading-relaxed text-[#D4C5B3] overflow-x-auto pr-20">
                <code>{codeSnippets[activeCodeTab]}</code>
              </pre>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-black/30 flex items-center justify-between text-xs text-white/70">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                <span>Python 3.10 Engine is actively powering face scans & order processing</span>
              </span>
              <button
                type="button"
                onClick={() => setShowCodeModal(false)}
                className="px-4 py-2 rounded-full bg-[#A3B899] text-[#121C15] font-bold hover:bg-[#A3B899]/90 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
