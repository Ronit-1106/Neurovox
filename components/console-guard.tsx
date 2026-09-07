'use client';

import { useEffect } from 'react';

function isBenignWasmLog(arg: any): boolean {
  if (!arg) return false;
  const str = typeof arg === 'string' ? arg : (arg.message || String(arg));
  return (
    str.includes('TensorFlow Lite') ||
    str.includes('XNNPACK delegate') ||
    str.includes('XNNPACK') ||
    str.includes('vision_wasm_internal') ||
    str.startsWith('INFO:') ||
    str.startsWith('WARNING: Logging before InitGoogleLogging')
  );
}

export function installConsoleGuard() {
  if (typeof window === 'undefined') return;

  const currentError = window.console.error;
  if ((currentError as any)?.__isGuarded) return;

  const guardedError = function (...args: any[]) {
    if (args.some(isBenignWasmLog)) {
      // Re-route Emscripten / MediaPipe informational messages to console.info
      // so they do not trigger Next.js development error overlay
      console.info(...args);
      return;
    }
    return currentError.apply(window.console, args);
  };
  (guardedError as any).__isGuarded = true;
  window.console.error = guardedError;

  // Window error event listener
  if (!(window as any).__wasmErrorListenerAttached) {
    window.addEventListener('error', (event) => {
      if (isBenignWasmLog(event.message) || isBenignWasmLog(event.error)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      if (isBenignWasmLog(event.reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });
    (window as any).__wasmErrorListenerAttached = true;
  }
}

// Immediate execution on client module evaluation
if (typeof window !== 'undefined') {
  installConsoleGuard();
}

export function ConsoleGuard() {
  useEffect(() => {
    installConsoleGuard();
    // Guard against Next.js re-patching console.error during HMR/overlay cycles
    const interval = setInterval(installConsoleGuard, 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
