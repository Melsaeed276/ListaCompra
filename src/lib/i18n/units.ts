import type { Unit } from '../types';
import type { Locale } from './locale';

const LABELS: Partial<Record<Locale, Record<Unit, string>>> = {
  tr: {
    unidad: 'adet', kg: 'kg', g: 'g', l: 'l', ml: 'ml',
    paquete: 'paket', docena: 'düzine', caja: 'kutu',
  },
  ar: {
    unidad: 'قطعة', kg: 'كغ', g: 'غ', l: 'لتر', ml: 'مل',
    paquete: 'عبوة', docena: 'دزينة', caja: 'علبة',
  },
};

export function unitLabel(unit: Unit, locale?: Locale): string {
  return LABELS[locale ?? 'en']?.[unit] ?? unit;
}
