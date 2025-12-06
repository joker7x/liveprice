
export interface DrugRaw {
  // Fields from 'drugs' table (Updates DB - Main Source)
  idx?: number;
  id?: string | number; 
  drug_no?: string;     // Mapped from Medhom ID
  name_en?: string;
  name_ar?: string;
  new_price?: string | number;
  old_price?: string | number;
  update_date?: string;
  source?: string;
  created_at?: string;
  updated_at?: string;

  // Fields for 'drugsfull' table (Archive DB - Sync Target)
  price_new?: string | number;
  price_old?: string | number;
  timestamp_ms?: string;
  
  // Legacy/Fallbacks
  name?: string;
  arabic?: string;
  price?: string | number;
  oldprice?: string | number;
  Date_updated?: string;
}

// Exact shape of the Medhom API response item
export interface MedhomItem {
  id: string;          // Maps to drug_no
  name: string;        // Maps to name_en
  arabic: string;      // Maps to name_ar
  oldprice: string;    // Maps to old_price
  price: string;       // Maps to new_price
  sold_times: string;
  Date_updated: string; // Maps to update_date
}

export interface Drug {
  id: string; // Will store 'drug_no' if available
  nameEn: string;
  nameAr: string;
  newPrice: number | null;
  oldPrice: number | null;
  updatedAt: string | null;
}

export interface FullDrug {
  id: number;
  name_en: string;
  name_ar: string;
  price_new: string;
  price_old: string;
  composition: string; 
  company: string;
  description: string;
  dosage_form: string;
  route: string;
  pack_size: number;
  barcode_main: string;
  image_url?: string;
  timestamp_ms?: string;
}

export interface LightDrug {
  id: number;
  n: string; // name
  p: number; // price
  c: string; // company
  a: string; // active ingredient (composition)
}

export interface CompanyStats {
    name: string;
    count: number;
}

export type TabMode = 'all' | 'changed' | 'fav';
export type AppView = 'home' | 'stats' | 'settings' | 'admin';

export interface FilterState {
  mode: TabMode;
  search: string;
}

export interface AdminStats {
  totalDrugs: number;
  totalChanged: number;
  lastUpdate: string;
  topGainers: Drug[];
  healthScore: number;
  averageIncrease: number;
  priceRanges: { low: number, mid: number, high: number };
  dataIssues: {
    missingArabic: number;
    zeroPrice: number;
    missingOldPrice: number;
  };
}

export interface DrugFormData {
  nameEn: string;
  nameAr: string;
  newPrice: string;
  oldPrice: string;
  drugNo?: string; 
}

export interface BroadcastMessage {
  isActive: boolean;
  text: string;
  type: 'info' | 'warning' | 'success';
}

export interface AIAnalysisResult {
  marketTrend: 'stable' | 'inflation' | 'volatile';
  summary: string;
  predictedHikes: string[];
  topCompanies: { name: string, sentiment: 'aggressive' | 'stable', count: number }[];
  shortageRisk: string[];
}

export interface DeepMarketAnalysis {
  reportDate: string;
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  executiveSummary: string;
  buyOpportunities: Array<{
    name: string;
    reason: string;
    urgency: 'high' | 'medium';
  }>;
  companyAnalysis: Array<{
    name: string;
    inflationRate: number;
    strategy: string;
  }>;
  shortageWarnings: Array<{
    category: string;
    riskLevel: 'high' | 'medium';
    reason: string;
  }>;
}

export interface TawreedStore {
  storeName: string;
  storeProductId: string | null;
  salePrice: number | null;
  retailPrice: number | null;
  discountPercent: number | null;
  availableQuantity: number | null;
}

export interface TawreedProduct {
  productId: string;
  productName: string;
  stores: TawreedStore[];
  totalQty: number;
  avgDiscount: number | null;
  bestSale: number | null;
}
