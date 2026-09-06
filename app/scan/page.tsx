import { FaceScanner } from '@/components/face-scanner';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scan Face | Neurovox AI',
  description: 'Real-time AI biometric face scanning for instant and accurate mask sizing.',
};

export default function ScanPage() {
  return <FaceScanner />;
}
