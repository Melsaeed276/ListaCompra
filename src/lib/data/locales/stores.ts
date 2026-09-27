import type { Store } from '../../types';
import type { Locale } from '../../i18n/locale';
import { STORES_SEED } from '../stores';

// Tiendas por cultura. Los IDs van prefijados por locale para no colisionar si
// el usuario cambia de idioma. Se usan badges de color (sin logos) para las
// culturas nuevas. El seed español mantiene sus tiendas e IDs originales.

const s = (
  id: string, name: string, typeId: string,
  emoji: string, bg: string, fg: string, initials?: string, logo?: string,
  online = false,
): Store => ({
  id, name, typeId,
  icon: logo ? { kind: 'image', value: logo } : { kind: 'emoji', value: emoji },
  brand: { bg, fg, initials },
  ...(online ? { online: true } : {}),
});

// Tiendas retiradas del catálogo de Türkiye por vender alcohol (o, en el caso
// del büfe genérico, porque no se puede garantizar que no lo venda). Mantener
// sus IDs permite limpiar instalaciones existentes sin confundirlas con
// tiendas creadas por el usuario.
export const RETIRED_SEED_STORE_IDS = new Set([
  'tr-migros', 'tr-carrefoursa', 'tr-macrocenter', 'tr-metro', 'tr-bufe',
  'ar-migros', 'ar-carrefoursa', 'ar-macrocenter', 'ar-metro', 'ar-bufe',
]);

// 🇬🇧 Reino Unido
const UK: Store[] = [
  s('uk-tesco',       'Tesco',          'supermercado', '🛒', '#00539F', '#FFFFFF', 'T'),
  s('uk-sainsburys',  "Sainsbury's",    'supermercado', '🛒', '#F06C00', '#FFFFFF', 'S'),
  s('uk-asda',        'Asda',           'supermercado', '🛒', '#68A51C', '#FFFFFF', 'A'),
  s('uk-morrisons',   'Morrisons',      'supermercado', '🛒', '#FFC200', '#004B23', 'M'),
  s('uk-waitrose',    'Waitrose',       'supermercado', '🛒', '#5A8100', '#FFFFFF', 'W'),
  s('uk-aldi',        'Aldi',           'supermercado', '🛒', '#001E60', '#FF7300', 'AL'),
  s('uk-lidl',        'Lidl',           'supermercado', '🛒', '#0050AA', '#FFE600', 'L'),
  s('uk-coop',        'Co-op',          'supermercado', '🛒', '#00B1E7', '#FFFFFF', 'C'),
  s('uk-mands',       'M&S Food',       'supermercado', '🛍️', '#000000', '#FFFFFF', 'M&S'),
  s('uk-butcher',     'Butcher',        'carniceria',   '🥩', '#8B1E1E', '#FFFFFF'),
  s('uk-fishmonger',  'Fishmonger',     'pescaderia',   '🐟', '#0E6BA8', '#FFFFFF'),
  s('uk-bakery',      'Bakery',         'panaderia',    '🥖', '#B5651D', '#FFFFFF'),
  s('uk-boots',       'Boots',          'farmacia',     '💊', '#0055A5', '#FFFFFF', 'B'),
  s('uk-primark',     'Primark',        'ropa',         '👕', '#00A9E0', '#FFFFFF', 'P'),
  s('uk-bandq',       'B&Q',            'ferreteria',   '🔧', '#FF6600', '#FFFFFF', 'B&Q'),
  s('uk-ikea',        'IKEA',           'hogar',        '🛋️', '#0058A3', '#FFDA1A', 'IK'),
  s('uk-corner',      'Corner shop',    'otros',        '🏪', '#555555', '#FFFFFF'),
];

// 🇺🇸 Estados Unidos
const US: Store[] = [
  s('us-walmart',     'Walmart',        'supermercado', '🛒', '#0071CE', '#FFC220', 'W'),
  s('us-costco',      'Costco',         'supermercado', '🛒', '#E31837', '#005DAA', 'C'),
  s('us-target',      'Target',         'supermercado', '🎯', '#CC0000', '#FFFFFF', 'T'),
  s('us-kroger',      'Kroger',         'supermercado', '🛒', '#004990', '#FFFFFF', 'K'),
  s('us-safeway',     'Safeway',        'supermercado', '🛒', '#E11B22', '#FFFFFF', 'S'),
  s('us-wholefoods',  'Whole Foods',    'supermercado', '🥬', '#00674B', '#FFFFFF', 'WF'),
  s('us-traderjoes',  "Trader Joe's",   'supermercado', '🛒', '#B4121B', '#FFFFFF', 'TJ'),
  s('us-publix',      'Publix',         'supermercado', '🛒', '#007A33', '#FFFFFF', 'P'),
  s('us-aldi',        'Aldi',           'supermercado', '🛒', '#001E60', '#FF7300', 'AL'),
  s('us-butcher',     'Butcher shop',   'carniceria',   '🥩', '#8B1E1E', '#FFFFFF'),
  s('us-seafood',     'Seafood market', 'pescaderia',   '🦞', '#0E6BA8', '#FFFFFF'),
  s('us-bakery',      'Bakery',         'panaderia',    '🥖', '#B5651D', '#FFFFFF'),
  s('us-cvs',         'CVS Pharmacy',   'farmacia',     '💊', '#CC0000', '#FFFFFF', 'CVS'),
  s('us-gap',         'Gap',            'ropa',         '👕', '#002868', '#FFFFFF', 'GAP'),
  s('us-homedepot',   'Home Depot',     'ferreteria',   '🔧', '#F96302', '#FFFFFF', 'HD'),
  s('us-ikea',        'IKEA',           'hogar',        '🛋️', '#0058A3', '#FFDA1A', 'IK'),
  s('us-7eleven',     '7-Eleven',       'otros',        '🏪', '#008061', '#FF7300', '7'),
];

// 🇫🇷 Francia
const FR: Store[] = [
  s('fr-carrefour',   'Carrefour',      'supermercado', '🛒', '#004E9F', '#FFFFFF', 'C'),
  s('fr-leclerc',     'E.Leclerc',      'supermercado', '🛒', '#0066B3', '#FF6A00', 'L'),
  s('fr-auchan',      'Auchan',         'supermercado', '🛒', '#E2001A', '#00843D', 'A'),
  s('fr-intermarche', 'Intermarché',    'supermercado', '🛒', '#E2001A', '#FFFFFF', 'I'),
  s('fr-superu',      'Super U',        'supermercado', '🛒', '#E30613', '#FFFFFF', 'U'),
  s('fr-monoprix',    'Monoprix',       'supermercado', '🛒', '#F39200', '#000000', 'M'),
  s('fr-casino',      'Casino',         'supermercado', '🛒', '#E2001A', '#FFFFFF', 'CA'),
  s('fr-lidl',        'Lidl',           'supermercado', '🛒', '#0050AA', '#FFE600', 'L'),
  s('fr-aldi',        'Aldi',           'supermercado', '🛒', '#001E60', '#FF7300', 'AL'),
  s('fr-boucherie',   'Boucherie',      'carniceria',   '🥩', '#8B1E1E', '#FFFFFF'),
  s('fr-poissonnerie','Poissonnerie',   'pescaderia',   '🐟', '#0E6BA8', '#FFFFFF'),
  s('fr-boulangerie', 'Boulangerie',    'panaderia',    '🥖', '#B5651D', '#FFFFFF'),
  s('fr-pharmacie',   'Pharmacie',      'farmacia',     '💊', '#009E3D', '#FFFFFF'),
  s('fr-kiabi',       'Kiabi',          'ropa',         '👕', '#E5007D', '#FFFFFF', 'K'),
  s('fr-leroymerlin', 'Leroy Merlin',   'ferreteria',   '🔧', '#78BE20', '#FFFFFF', 'LM'),
  s('fr-ikea',        'IKEA',           'hogar',        '🛋️', '#0058A3', '#FFDA1A', 'IK'),
  s('fr-tabac',       'Épicerie / Tabac','otros',       '🏪', '#B31217', '#FFFFFF'),
];

// 🇩🇪 Alemania
const DE: Store[] = [
  s('de-aldi',        'Aldi',           'supermercado', '🛒', '#001E60', '#FF7300', 'AL'),
  s('de-lidl',        'Lidl',           'supermercado', '🛒', '#0050AA', '#FFE600', 'L'),
  s('de-rewe',        'Rewe',           'supermercado', '🛒', '#CC071E', '#FFFFFF', 'R'),
  s('de-edeka',       'Edeka',          'supermercado', '🛒', '#FFD100', '#005CA9', 'E'),
  s('de-kaufland',    'Kaufland',       'supermercado', '🛒', '#E10915', '#FFFFFF', 'K'),
  s('de-netto',       'Netto',          'supermercado', '🛒', '#FFcc00', '#E2001A', 'N'),
  s('de-penny',       'Penny',          'supermercado', '🛒', '#CE1417', '#FFE600', 'P'),
  s('de-dm',          'dm Drogerie',    'supermercado', '🧴', '#002878', '#FFFFFF', 'dm'),
  s('de-metzgerei',   'Metzgerei',      'carniceria',   '🥩', '#8B1E1E', '#FFFFFF'),
  s('de-fischladen',  'Fischladen',     'pescaderia',   '🐟', '#0E6BA8', '#FFFFFF'),
  s('de-baeckerei',   'Bäckerei',       'panaderia',    '🥖', '#B5651D', '#FFFFFF'),
  s('de-apotheke',    'Apotheke',       'farmacia',     '💊', '#E2001A', '#FFFFFF', 'A'),
  s('de-cunda',       'C&A',            'ropa',         '👕', '#002F87', '#FFFFFF', 'C&A'),
  s('de-obi',         'OBI',            'ferreteria',   '🔧', '#FF7300', '#FFFFFF', 'OBI'),
  s('de-ikea',        'IKEA',           'hogar',        '🛋️', '#0058A3', '#FFDA1A', 'IK'),
  s('de-kiosk',       'Kiosk / Späti',  'otros',        '🏪', '#444444', '#FFFFFF'),
];

// 🇧🇷 Brasil
const BR: Store[] = [
  s('br-mendoza',     'Mendoza',        'supermercado', '🛒', '#D32F2F', '#FFFFFF', 'M'),
  s('br-pao-acucar',  'Pão de Açúcar',  'supermercado', '🛒', '#E30613', '#FFFFFF', 'PA'),
  s('br-carrefour',   'Carrefour',      'supermercado', '🛒', '#004E9F', '#FFFFFF', 'C'),
  s('br-extra',       'Extra',          'supermercado', '🛒', '#E2001A', '#FFDD00', 'E'),
  s('br-assai',       'Assaí',          'supermercado', '🛒', '#002D74', '#FFFFFF', 'A'),
  s('br-atacadao',    'Atacadão',       'supermercado', '🛒', '#E30613', '#FFDD00', 'AT'),
  s('br-dia',         'Dia',            'supermercado', '🛒', '#E20613', '#FFE600', 'D'),
  s('br-acougue',     'Açougue',        'carniceria',   '🥩', '#8B1E1E', '#FFFFFF'),
  s('br-peixaria',    'Peixaria',       'pescaderia',   '🐟', '#0E6BA8', '#FFFFFF'),
  s('br-padaria',     'Padaria',        'panaderia',    '🥖', '#B5651D', '#FFFFFF'),
  s('br-drogaria',    'Drogaria',       'farmacia',     '💊', '#00A651', '#FFFFFF'),
  s('br-renner',      'Renner',         'ropa',         '👕', '#E4002B', '#FFFFFF', 'R'),
  s('br-casas-bahia', 'Casas Bahia',    'hogar',        '🛋️', '#003DA5', '#FFFFFF', 'CB'),
  s('br-leroy',       'Leroy Merlin',   'ferreteria',   '🔧', '#78BE20', '#FFFFFF', 'LM'),
  s('br-mercadinho',  'Mercadinho',     'otros',        '🏪', '#555555', '#FFFFFF'),
];

// 🇹🇷 Türkiye
const TR: Store[] = [
  s('tr-a101',         'A101',           'supermercado', '🛒', '#FFFFFF', '#41A9C7', 'A101', '/logos/a101.svg'),
  s('tr-bim',          'BİM',            'supermercado', '🛒', '#FFFFFF', '#0054A6', 'BİM', '/logos/bim.svg'),
  s('tr-sok',          'ŞOK',            'supermercado', '🛒', '#FFD500', '#E30613', 'ŞOK', '/logos/sok.svg'),
  s('tr-hakmar',       'Hakmar',         'supermercado', '🛒', '#FFFFFF', '#4DBA45', 'H', '/logos/hakmar.png'),
  s('tr-trendyol',     'Trendyol',       'supermercado', '🛍️', '#F27A1A', '#FFFFFF', 'T', '/logos/trendyol.svg', true),
  s('tr-pazar',        'Pazar',          'supermercado', '🧺', '#2F855A', '#FFFFFF'),
  s('tr-kasap',        'Kasap',          'carniceria',   '🥩', '#8B1E1E', '#FFFFFF'),
  s('tr-balikci',      'Balıkçı',        'pescaderia',   '🐟', '#0E6BA8', '#FFFFFF'),
  s('tr-firin',        'Fırın',          'panaderia',    '🥖', '#B5651D', '#FFFFFF'),
  s('tr-eczane',       'Eczane',         'farmacia',     '💊', '#E30613', '#FFFFFF'),
  s('tr-gratis',       'Gratis',         'perfumeria',   '🧴', '#FFFFFF', '#7A1E88', 'G', '/logos/gratis.svg'),
  s('tr-koctas',       'Koçtaş',         'ferreteria',   '🔧', '#FFFFFF', '#F36C21', 'K', '/logos/koctas.png'),
  s('tr-ikea',         'IKEA',           'hogar',        '🛋️', '#FFFFFF', '#0058A3', 'IK', '/logos/ikea.svg'),
];

// العربية لتركيا: العلامات التجارية تبقى كما هي، والأسماء العامة مترجمة.
const AR: Store[] = [
  s('ar-a101',         'A101',           'supermercado', '🛒', '#FFFFFF', '#41A9C7', 'A101', '/logos/a101.svg'),
  s('ar-bim',          'BİM',            'supermercado', '🛒', '#FFFFFF', '#0054A6', 'BİM', '/logos/bim.svg'),
  s('ar-sok',          'ŞOK',            'supermercado', '🛒', '#FFD500', '#E30613', 'ŞOK', '/logos/sok.svg'),
  s('ar-hakmar',       'Hakmar',         'supermercado', '🛒', '#FFFFFF', '#4DBA45', 'H', '/logos/hakmar.png'),
  s('ar-trendyol',     'Trendyol',       'supermercado', '🛍️', '#F27A1A', '#FFFFFF', 'T', '/logos/trendyol.svg', true),
  s('ar-pazar',        'السوق الأسبوعي', 'supermercado', '🧺', '#2F855A', '#FFFFFF'),
  s('ar-kasap',        'الملحمة',        'carniceria',   '🥩', '#8B1E1E', '#FFFFFF'),
  s('ar-balikci',      'متجر الأسماك',   'pescaderia',   '🐟', '#0E6BA8', '#FFFFFF'),
  s('ar-firin',        'المخبز',         'panaderia',    '🥖', '#B5651D', '#FFFFFF'),
  s('ar-eczane',       'الصيدلية',       'farmacia',     '💊', '#E30613', '#FFFFFF'),
  s('ar-gratis',       'Gratis',         'perfumeria',   '🧴', '#FFFFFF', '#7A1E88', 'G', '/logos/gratis.svg'),
  s('ar-koctas',       'Koçtaş',         'ferreteria',   '🔧', '#FFFFFF', '#F36C21', 'K', '/logos/koctas.png'),
  s('ar-ikea',         'IKEA',           'hogar',        '🛋️', '#FFFFFF', '#0058A3', 'IK', '/logos/ikea.svg'),
];

export const LOCALIZED_STORES: Record<Locale, Store[]> = {
  es: STORES_SEED,
  en: UK,
  us: US,
  fr: FR,
  de: DE,
  br: BR,
  tr: TR,
  ar: AR,
};
