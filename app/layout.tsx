import type { Metadata } from 'next';
import './globals.css';
import { ConsoleGuard } from '@/components/console-guard';

export const metadata: Metadata = {
  title: 'Neurovox - Protective Mask AI Sizing',
  description: 'AI-assisted facial biometric analysis and protective mask sizing recommendation system.',
  openGraph: {
    title: 'Neurovox - Protective Mask AI Sizing',
    description: 'AI-assisted facial biometric analysis and protective mask sizing recommendation system.',
  },
};

const EARLY_WASM_LOG_GUARD = `
  (function() {
    function isBenign(str) {
      if (!str) return false;
      var text = typeof str === 'string' ? str : (str.message || '');
      return text.indexOf('XNNPACK') !== -1 ||
             text.indexOf('TensorFlow Lite') !== -1 ||
             text.indexOf('vision_wasm_internal') !== -1 ||
             text.indexOf('INFO:') === 0 ||
             text.indexOf('WARNING: Logging before InitGoogleLogging') === 0;
    }
    var origError = console.error;
    console.error = function() {
      for (var i = 0; i < arguments.length; i++) {
        if (isBenign(arguments[i])) {
          console.info.apply(console, arguments);
          return;
        }
      }
      return origError.apply(console, arguments);
    };
    window.addEventListener('error', function(e) {
      if (isBenign(e.message) || isBenign(e.error)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    });
    window.addEventListener('unhandledrejection', function(e) {
      if (isBenign(e.reason)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    });
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: EARLY_WASM_LOG_GUARD }} />
      </head>
      <body className="min-h-full flex flex-col bg-[#F5F2EA] text-[#2E3019] antialiased selection:bg-[#4E5B31]/20 selection:text-[#2E3019]">
        <ConsoleGuard />
        {children}
      </body>
    </html>
  );
}
