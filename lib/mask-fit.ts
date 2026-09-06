export interface FaceMeasurements {
  width: number; // in pixels
  height: number; // in pixels
  ratio: number; // width / height
  estimatedWidthCm: number; // approximated real-world width in cm
  estimatedHeightCm: number; // approximated real-world height in cm
  confidence: number;
}

export type MaskSize = 'Small' | 'Medium' | 'Large';

export interface MaskColorOption {
  name: string;
  hex: string;
  accentClass: string;
}

export interface MaskStyle {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: string;
  priceNumeric: number;
  sealScore: string;
  material: string;
  rating: number;
  reviewCount: number;
  features: string[];
  colors: MaskColorOption[];
}

export const MASK_STYLES: MaskStyle[] = [
  {
    id: 'everyday',
    name: 'Everyday Comfort Mask',
    tagline: 'Ultra-soft 3-layer organic modal weave',
    description: 'Designed for daily errands, transit, and office wear with zero ear-strain and soft adjustable loops.',
    price: '$18.00',
    priceNumeric: 18.0,
    sealScore: '96.8%',
    material: 'Organic Modal & Breathable Cotton',
    rating: 4.9,
    reviewCount: 1420,
    features: [
      '3-Layer Hypoallergenic Modal Blend',
      'Ergonomic memory-flex nose strip',
      'Ultra-soft padded ear loops',
      'Washable & reusable up to 60 washes'
    ],
    colors: [
      { name: 'Sage Green', hex: '#8A9A5B', accentClass: 'bg-[#8A9A5B]' },
      { name: 'Midnight Black', hex: '#1C1E1B', accentClass: 'bg-[#1C1E1B]' },
      { name: 'Desert Sand', hex: '#D2C5B0', accentClass: 'bg-[#D2C5B0]' },
      { name: 'Dusty Rose', hex: '#C4989E', accentClass: 'bg-[#C4989E]' },
      { name: 'Navy Blue', hex: '#263445', accentClass: 'bg-[#263445]' }
    ]
  },
  {
    id: 'sport',
    name: 'Active Sport Pro',
    tagline: 'High-airflow moisture-dispersion mesh',
    description: 'Contours snugly around the jawline during cardio, running, and high-movement sessions with zero slippage.',
    price: '$24.00',
    priceNumeric: 24.0,
    sealScore: '98.5%',
    material: 'Poly-Mesh Airflow with Ergonomic Seal',
    rating: 4.8,
    reviewCount: 980,
    features: [
      'Dual active exhale micromesh channels',
      'Anti-fog aerodynamic nose seal',
      'Sweat-wicking antimicrobial liner',
      'Dual rear-head comfort strap system'
    ],
    colors: [
      { name: 'Carbon Black', hex: '#18181B', accentClass: 'bg-[#18181B]' },
      { name: 'Electric Lime', hex: '#84CC16', accentClass: 'bg-[#84CC16]' },
      { name: 'Slate Grey', hex: '#64748B', accentClass: 'bg-[#64748B]' },
      { name: 'Cobalt Blue', hex: '#2563EB', accentClass: 'bg-[#2563EB]' },
      { name: 'Solar Orange', hex: '#EA580C', accentClass: 'bg-[#EA580C]' }
    ]
  },
  {
    id: 'shield',
    name: 'N95 Shield Plus',
    tagline: 'Medical-grade 5-layer particulate barrier',
    description: 'Maximum biological filtration efficiency with reinforced memory nose bridge clamp and certified particulate seal.',
    price: '$28.00',
    priceNumeric: 28.0,
    sealScore: '99.4%',
    material: '5-Ply Meltblown Nanofiber',
    rating: 4.95,
    reviewCount: 2310,
    features: [
      '99.4% Particulate Filtration Efficiency (PFE)',
      'Contoured 3D cup shape with breathing chamber',
      'Silicone airtight jawline edge gasket',
      'Adjustable dual headbands for medical-grade seal'
    ],
    colors: [
      { name: 'Crisp White', hex: '#F8FAFC', accentClass: 'bg-[#F8FAFC]' },
      { name: 'Medical Blue', hex: '#0284C7', accentClass: 'bg-[#0284C7]' },
      { name: 'Charcoal Black', hex: '#27272A', accentClass: 'bg-[#27272A]' },
      { name: 'Olive Green', hex: '#4B5320', accentClass: 'bg-[#4B5320]' }
    ]
  }
];

// Key facial landmarks for mask fitment:
// 234: Left pre-auricular / jaw curve
// 454: Right pre-auricular / jaw curve
// 152: Menton / chin bottom
// 168: Glabella / nasion (bridge of nose)
// 50: Left cheek / upper mask contact
// 280: Right cheek / upper mask contact
// 4: Nose tip
// 33, 133: Left eye outer and inner corners (used for pupil center calculation)
// 263, 362: Right eye outer and inner corners (used for pupil center calculation)
export const KEY_LANDMARK_INDICES = [234, 454, 152, 50, 280, 168];

export interface SizeOptionDetails {
  size: MaskSize;
  name: string;
  badge: string;
  widthRange: string;
  heightRange: string;
  description: string;
  recommendedFor: string;
}

export const MASK_SIZE_OPTIONS: SizeOptionDetails[] = [
  {
    size: 'Small',
    name: 'Size S (Petite / Slim)',
    badge: 'Petite Fit',
    widthRange: '< 12.2 cm',
    heightRange: '< 11.2 cm',
    description: 'Narrower jawline and compact cheek span with tailored contouring.',
    recommendedFor: 'Slender faces, adolescents, or those preferring a very snug seal.'
  },
  {
    size: 'Medium',
    name: 'Size M (Standard Adult)',
    badge: 'Universal Fit',
    widthRange: '12.2 – 14.0 cm',
    heightRange: '11.2 – 12.6 cm',
    description: 'Optimal balance between nose bridge clamp and chin contour.',
    recommendedFor: 'Over 75% of adult facial structures.'
  },
  {
    size: 'Large',
    name: 'Size L (Broad / Extended)',
    badge: 'Comfort Fit',
    widthRange: '> 14.0 cm',
    heightRange: '> 12.6 cm',
    description: 'Expanded cheek span and deeper chin cup for broad structures.',
    recommendedFor: 'Broader jawlines, fuller cheeks, or taller nose-to-chin spans.'
  }
];

export function computeMaskSizeFromBiometrics(measurements: FaceMeasurements): MaskSize {
  const { estimatedWidthCm, estimatedHeightCm } = measurements;

  // Primary: Balanced Anthropometric Metric
  if (estimatedWidthCm > 0 && estimatedHeightCm > 0) {
    const compositeScore = estimatedWidthCm * 0.55 + estimatedHeightCm * 0.45;

    // Small: petite facial structure
    if (compositeScore < 11.9 || (estimatedWidthCm < 12.2 && estimatedHeightCm < 11.2)) {
      return 'Small';
    }
    // Large: broad or taller facial structure
    if (compositeScore > 13.4 || (estimatedWidthCm > 14.0 && estimatedHeightCm > 12.5)) {
      return 'Large';
    }
    // Standard adult human fits Medium
    return 'Medium';
  }

  // Fallback using single metric
  if (estimatedWidthCm > 0) {
    if (estimatedWidthCm < 12.2) return 'Small';
    if (estimatedWidthCm > 14.0) return 'Large';
    return 'Medium';
  }

  // Fallback to ratio
  const ratio = measurements.ratio || 1.15;
  if (ratio < 1.05) return 'Small';
  if (ratio > 1.25) return 'Large';
  return 'Medium';
}

export function generateSimulatedFaceMeasurements(targetSize?: MaskSize): FaceMeasurements {
  let widthCm: number;
  let heightCm: number;

  if (targetSize === 'Small') {
    widthCm = Number((11.4 + Math.random() * 0.6).toFixed(1));
    heightCm = Number((10.5 + Math.random() * 0.5).toFixed(1));
  } else if (targetSize === 'Large') {
    widthCm = Number((14.3 + Math.random() * 0.7).toFixed(1));
    heightCm = Number((12.8 + Math.random() * 0.6).toFixed(1));
  } else if (targetSize === 'Medium') {
    widthCm = Number((13.1 + Math.random() * 0.6).toFixed(1));
    heightCm = Number((11.8 + Math.random() * 0.5).toFixed(1));
  } else {
    // Balanced realistic distribution: 25% Small, 55% Medium, 20% Large
    const roll = Math.random();
    if (roll < 0.25) {
      widthCm = Number((11.5 + Math.random() * 0.6).toFixed(1));
      heightCm = Number((10.5 + Math.random() * 0.5).toFixed(1));
    } else if (roll < 0.80) {
      widthCm = Number((13.0 + Math.random() * 0.7).toFixed(1));
      heightCm = Number((11.8 + Math.random() * 0.5).toFixed(1));
    } else {
      widthCm = Number((14.2 + Math.random() * 0.7).toFixed(1));
      heightCm = Number((12.8 + Math.random() * 0.6).toFixed(1));
    }
  }

  const pxPerCm = 23;
  const widthPx = Math.round(widthCm * pxPerCm);
  const heightPx = Math.round(heightCm * pxPerCm);
  const ratio = Number((widthPx / heightPx).toFixed(2));

  return {
    width: widthPx,
    height: heightPx,
    ratio,
    estimatedWidthCm: widthCm,
    estimatedHeightCm: heightCm,
    confidence: 0.98
  };
}
