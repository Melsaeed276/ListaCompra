// Capa de persistencia local. El estado completo vive en LocalStorage;
// la sync entre dispositivos se hace contra Home Assistant (lib/sync.svelte.ts).

import type { AppState, Company } from './types';
import { STORE_TYPES } from './data/storeTypes';
import { STORES_SEED } from './data/stores';
import { CATEGORIES_SEED } from './data/categories';
import { PRODUCTS_SEED } from './data/products';

const STORAGE_KEY = 'tucompra:state:v1';
export const COMPANY_SEED_VERSION = 2;

export const DEFAULT_COMPANIES: Company[] = [
  { id: 'company-eti', name: 'ETİ', icon: { kind: 'emoji', value: '🍪' } },
  { id: 'company-torku', name: 'Torku', icon: { kind: 'emoji', value: '🌾' } },
  { id: 'company-sutas', name: 'Sütaş', icon: { kind: 'emoji', value: '🥛' } },
  { id: 'company-dardanel', name: 'Dardanel', icon: { kind: 'emoji', value: '🐟' } },
  { id: 'company-tadim', name: 'Tadım', icon: { kind: 'emoji', value: '🥜' } },
  { id: 'company-pinar', name: 'Pınar', icon: { kind: 'emoji', value: '🧀' } },
  { id: 'company-teksut', name: 'Teksüt', icon: { kind: 'emoji', value: '🥛' } },
  { id: 'company-eker', name: 'Eker', icon: { kind: 'emoji', value: '🥣' } },
  { id: 'company-ekici', name: 'Ekici', icon: { kind: 'emoji', value: '🧀' } },
  { id: 'company-muratbey', name: 'Muratbey', icon: { kind: 'emoji', value: '🧀' } },
  { id: 'company-tahsildaroglu', name: 'Tahsildaroğlu', icon: { kind: 'emoji', value: '🧀' } },
  { id: 'company-balparmak', name: 'Balparmak', icon: { kind: 'emoji', value: '🍯' } },
  { id: 'company-koska', name: 'Koska', icon: { kind: 'emoji', value: '🍬' } },
  { id: 'company-solen', name: 'Şölen', icon: { kind: 'emoji', value: '🍫' } },
  { id: 'company-elvan', name: 'Elvan', icon: { kind: 'emoji', value: '🍬' } },
  { id: 'company-reis', name: 'Reis', icon: { kind: 'emoji', value: '🍚' } },
  { id: 'company-yayla', name: 'Yayla', icon: { kind: 'emoji', value: '🫘' } },
  { id: 'company-duru-bulgur', name: 'Duru Bulgur', icon: { kind: 'emoji', value: '🌾' } },
  { id: 'company-oba-makarna', name: 'Oba Makarna', icon: { kind: 'emoji', value: '🍝' } },
  { id: 'company-nuhun-ankara', name: "Nuh'un Ankara Makarnası", icon: { kind: 'emoji', value: '🍝' } },
  { id: 'company-dimes', name: 'DİMES', icon: { kind: 'emoji', value: '🧃' } },
  { id: 'company-aroma', name: 'Aroma', icon: { kind: 'emoji', value: '🧃' } },
  { id: 'company-caykur', name: 'ÇAYKUR', icon: { kind: 'emoji', value: '🍵' } },
  { id: 'company-dogus-cay', name: 'Doğuş Çay', icon: { kind: 'emoji', value: '🍵' } },
  { id: 'company-uludag', name: 'Uludağ İçecek', icon: { kind: 'emoji', value: '🥤' } },
  { id: 'company-beypazari', name: 'Beypazarı', icon: { kind: 'emoji', value: '💧' } },
  { id: 'company-tamek', name: 'TAMEK', icon: { kind: 'emoji', value: '🥫' } },
  { id: 'company-burcu', name: 'Burcu', icon: { kind: 'emoji', value: '🥫' } },
  { id: 'company-bagdat', name: 'Bağdat Baharat', icon: { kind: 'emoji', value: '🌶️' } },
  { id: 'company-arifoglu', name: 'Arifoğlu', icon: { kind: 'emoji', value: '🌿' } },
  { id: 'company-pakmaya', name: 'Pakmaya', icon: { kind: 'emoji', value: '🍞' } },
  { id: 'company-orkide', name: 'Orkide', icon: { kind: 'emoji', value: '🫒' } },
  { id: 'company-kristal', name: 'Kristal', icon: { kind: 'emoji', value: '🫒' } },
  { id: 'company-marmarabirlik', name: 'Marmarabirlik', icon: { kind: 'emoji', value: '🫒' } },
];

export function createInitialState(): AppState {
  return {
    version: 1,
    storeTypes: STORE_TYPES,
    stores: STORES_SEED,
    categories: CATEGORIES_SEED,
    companies: DEFAULT_COMPANIES.map((company) => ({ ...company })),
    companySeedVersion: COMPANY_SEED_VERSION,
    products: PRODUCTS_SEED,
    lists: {},
  };
}

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') return createInitialState();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createInitialState();
  try {
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== 1) return createInitialState();
    return parsed;
  } catch {
    return createInitialState();
  }
}

export function saveState(state: AppState): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
