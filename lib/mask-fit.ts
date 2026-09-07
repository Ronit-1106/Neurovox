/**
 * Neurovox Protective Mask Fitting & Biometric Specifications
 * Anthropometric reference dimensions, sizing brackets, and product catalog.
 */

export type MaskSize = 'Small' | 'Medium' | 'Large';

export interface FaceMeasurements {
  /** Estimated jaw span in cm based on calibrated reference distance */
  jawWidth: number;
  /** Estimated face height (nasion to menton) in cm */
  faceHeight: number;
  /** Estimated bizygomatic cheek width in cm */
  faceWidth?: number;
  /** Estimated chin-to-mouth distance in cm */
  chinToNose?: number;
  /** Calibrated reference distance used for scale normalization */
  referenceInterEyeDistanceCm: number;
  /** Scale-invariant facial ratio (jaw width / face height) */
  facialRatio?: number;
}

export interface ModelPrediction {
  predictedSize: MaskSize;
  confidence: number; // 0.0 to 1.0 (winning softmax probability)
  probabilities: {
    Small: number;
    Medium: number;
    Large: number;
  };
  scanQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  coefficientOfVariation: number; // Stability metric across captured frames
  isDemoSimulation?: boolean;
}

export interface MaskStyle {
  id: string;
  name: string;
  tagline: string;
  description: string;
  priceInr: number; // In Indian Rupees (₹)
  priceFormatted: string;
  filtrationEfficiency: string;
  breathabilityIndex: string;
  idealFor: string;
  colors: {
    name: string;
    hex: string;
    bgClass: string;
  }[];
  specifications: {
    filterType: string;
    sealMaterial: string;
    strapType: string;
    lifespan: string;
    certification: string;
  };
}

export const MASK_STYLES: MaskStyle[] = [
  {
    id: 'aeroshield-pro',
    name: 'AeroShield Pro',
    tagline: 'Precision Seal & N99 Multi-Stage Filtration',
    description: 'Engineered for dense urban environments and industrial air quality. Dual exhalation micro-valves with medical-grade silicone ergonomic seal.',
    priceInr: 1999,
    priceFormatted: '₹1,999',
    filtrationEfficiency: '99.4% PM0.1 Particles',
    breathabilityIndex: '28 Pa/cm² Air Resistance',
    idealFor: 'Urban Commuting, Heavy Smog, Dusty Transit',
    colors: [
      { name: 'Obsidian Black', hex: '#1C1D18', bgClass: 'bg-[#1C1D18]' },
      { name: 'Sage Green', hex: '#63704D', bgClass: 'bg-[#63704D]' },
      { name: 'Titanium Gray', hex: '#7D8471', bgClass: 'bg-[#7D8471]' },
      { name: 'Warm Cream', hex: '#EAE6D9', bgClass: 'bg-[#EAE6D9]' },
    ],
    specifications: {
      filterType: 'Electrostatic Melt-blown 5-Layer Composite',
      sealMaterial: 'Skin-Contact Biocompatible Silicone',
      strapType: 'Dual Adjustable Elastic Crown + Nape Straps',
      lifespan: 'Reusable shell, 120-hour replaceable filter',
      certification: 'EN 149:2001 + A1:2009 FFP3 Standard',
    },
  },
  {
    id: 'urbanbreathe-minimal',
    name: 'UrbanBreathe Minimal',
    tagline: 'Ultralight Daily Protection with Low Breathing Resistance',
    description: 'Streamlined aesthetic silhouette crafted for everyday city use. Ultra-thin profile with shape-memory bridge for spectacles wearers.',
    priceInr: 1499,
    priceFormatted: '₹1,499',
    filtrationEfficiency: '98.2% PM2.5 / Bacteria',
    breathabilityIndex: '22 Pa/cm² Low Resistance',
    idealFor: 'Daily Office, Light Walking, Public Transport',
    colors: [
      { name: 'Matte Charcoal', hex: '#2A2B23', bgClass: 'bg-[#2A2B23]' },
      { name: 'Olive Drab', hex: '#4B5238', bgClass: 'bg-[#4B5238]' },
      { name: 'Desert Sand', hex: '#D6CEBE', bgClass: 'bg-[#D6CEBE]' },
    ],
    specifications: {
      filterType: 'Nanofiber High-Porosity Sub-Micron Layer',
      sealMaterial: 'Memory Foam Contour Cushion',
      strapType: 'Soft Knitted Ear-loops with Silicone Stopper',
      lifespan: 'Washable fabric shell, 80-hour filter cartridge',
      certification: 'KN95 / GB2626-2019 Compliant',
    },
  },
  {
    id: 'apexsport-active',
    name: 'ApexSport Active',
    tagline: 'Maximum Aerodynamic Airflow for Training & Cycling',
    description: 'High-performance athletic mask with panoramic dual-flow directional exhaust ports to prevent heat and moisture accumulation during exertion.',
    priceInr: 2299,
    priceFormatted: '₹2,299',
    filtrationEfficiency: '97.5% Dust & Particulate Ingress',
    breathabilityIndex: '18 Pa/cm² Ultra-Low Pressure Drop',
    idealFor: 'Running, Cycling, Outdoor High-Intensity Sports',
    colors: [
      { name: 'Midnight Stealth', hex: '#151610', bgClass: 'bg-[#151610]' },
      { name: 'High-Vis Amber', hex: '#C28432', bgClass: 'bg-[#C28432]' },
      { name: 'Slate Teal', hex: '#3B5953', bgClass: 'bg-[#3B5953]' },
    ],
    specifications: {
      filterType: 'Active Dynamic Flow Spunbond Cartridge',
      sealMaterial: 'Perforated Ergonomic Neoprene Blend',
      strapType: 'Quick-Release Magnetic Rear Hook Lock',
      lifespan: 'Water-resistant washable chassis, swappable filters',
      certification: 'ASTM F3502-21 Barrier Face Covering',
    },
  },
];

export interface MaskDimensionGuideline {
  size: MaskSize;
  label: string;
  recommendedJawSpan: string;
  recommendedFaceHeight: string;
  notes: string;
}

export const MASK_SIZE_GUIDELINES: Record<MaskSize, MaskDimensionGuideline> = {
  Small: {
    size: 'Small',
    label: 'Small (Petite)',
    recommendedJawSpan: '10.5 – 12.2 cm',
    recommendedFaceHeight: '9.5 – 11.2 cm',
    notes: 'Suited for smaller facial structures and compact jaw contours to prevent perimeter leakages.',
  },
  Medium: {
    size: 'Medium',
    label: 'Medium (Standard)',
    recommendedJawSpan: '12.3 – 13.9 cm',
    recommendedFaceHeight: '11.3 – 12.5 cm',
    notes: 'Optimized for standard adult facial proportions with balanced vertical and lateral seal tension.',
  },
  Large: {
    size: 'Large',
    label: 'Large (Extended)',
    recommendedJawSpan: '14.0 – 16.5 cm',
    recommendedFaceHeight: '12.6 – 14.8 cm',
    notes: 'Designed for broader mandibular bone structures and elongated nasal-to-chin spans.',
  },
};
