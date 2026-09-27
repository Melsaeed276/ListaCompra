import type { Product, Unit } from '../../../types';
import { mk } from './_mk';

type TurkeyProduct = [
  id: string,
  turkish: string,
  arabic: string,
  categoryId: string,
  emoji: string,
  unit?: Unit,
];

type PazarProduct = [
  id: string,
  turkish: string,
  arabic: string,
  emoji: string,
  unit?: Unit,
];

// Catálogo compartido por las dos experiencias de Türkiye. Los IDs y la
// clasificación son iguales; solo cambia el texto que se busca y se muestra.
const PRODUCTS: TurkeyProduct[] = [
  // Meyve & Sebze / فواكه وخضروات
  ['elma', 'Elma', 'تفاح', 'sup-fruteria', '🍎', 'kg'],
  ['muz', 'Muz', 'موز', 'sup-fruteria', '🍌', 'kg'],
  ['portakal', 'Portakal', 'برتقال', 'sup-fruteria', '🍊', 'kg'],
  ['mandalina', 'Mandalina', 'يوسفي', 'sup-fruteria', '🍊', 'kg'],
  ['limon', 'Limon', 'ليمون', 'sup-fruteria', '🍋', 'kg'],
  ['uzum', 'Üzüm', 'عنب', 'sup-fruteria', '🍇', 'kg'],
  ['cilek', 'Çilek', 'فراولة', 'sup-fruteria', '🍓', 'paquete'],
  ['armut', 'Armut', 'إجاص', 'sup-fruteria', '🍐', 'kg'],
  ['seftali', 'Şeftali', 'خوخ', 'sup-fruteria', '🍑', 'kg'],
  ['kiraz', 'Kiraz', 'كرز', 'sup-fruteria', '🍒', 'kg'],
  ['karpuz', 'Karpuz', 'بطيخ', 'sup-fruteria', '🍉'],
  ['kavun', 'Kavun', 'شمام', 'sup-fruteria', '🍈'],
  ['nar', 'Nar', 'رمان', 'sup-fruteria', '🍎'],
  ['avokado', 'Avokado', 'أفوكادو', 'sup-fruteria', '🥑'],
  ['domates', 'Domates', 'طماطم', 'sup-fruteria', '🍅', 'kg'],
  ['salatalik', 'Salatalık', 'خيار', 'sup-fruteria', '🥒', 'kg'],
  ['patates', 'Patates', 'بطاطا', 'sup-fruteria', '🥔', 'kg'],
  ['sogan', 'Soğan', 'بصل', 'sup-fruteria', '🧅', 'kg'],
  ['sarimsak', 'Sarımsak', 'ثوم', 'sup-fruteria', '🧄'],
  ['havuç', 'Havuç', 'جزر', 'sup-fruteria', '🥕', 'kg'],
  ['biber', 'Biber', 'فلفل', 'sup-fruteria', '🫑', 'kg'],
  ['patlican', 'Patlıcan', 'باذنجان', 'sup-fruteria', '🍆', 'kg'],
  ['kabak', 'Kabak', 'كوسا', 'sup-fruteria', '🥒', 'kg'],
  ['marul', 'Marul', 'خس', 'sup-fruteria', '🥬'],
  ['ispanak', 'Ispanak', 'سبانخ', 'sup-fruteria', '🥬', 'kg'],
  ['brokoli', 'Brokoli', 'بروكلي', 'sup-fruteria', '🥦'],
  ['mantar', 'Mantar', 'فطر', 'sup-fruteria', '🍄', 'paquete'],
  ['maydanoz', 'Maydanoz', 'بقدونس', 'sup-fruteria', '🌿'],
  ['nane', 'Nane', 'نعناع', 'sup-fruteria', '🌿'],

  // Et, tavuk ve balık / لحوم ودواجن وأسماك
  ['tavuk-gogsu', 'Tavuk göğsü', 'صدر دجاج', 'sup-carniceria', '🐔', 'kg'],
  ['tavuk-but', 'Tavuk but', 'أفخاذ دجاج', 'sup-carniceria', '🍗', 'kg'],
  ['butun-tavuk', 'Bütün tavuk', 'دجاجة كاملة', 'sup-carniceria', '🐔'],
  ['dana-kiyma', 'Dana kıyma', 'لحم بقري مفروم', 'sup-carniceria', '🥩', 'kg'],
  ['dana-kusbasi', 'Dana kuşbaşı', 'مكعبات لحم بقري', 'sup-carniceria', '🥩', 'kg'],
  ['dana-biftek', 'Dana biftek', 'شريحة لحم بقري', 'sup-carniceria', '🥩', 'kg'],
  ['kuzu-eti', 'Kuzu eti', 'لحم غنم', 'sup-carniceria', '🍖', 'kg'],
  ['kofte', 'Köfte', 'كفتة', 'sup-carniceria', '🍖', 'paquete'],
  ['sucuk', 'Sucuk', 'سجق تركي', 'sup-charcuteria', '🌭', 'paquete'],
  ['pastirma', 'Pastırma', 'بسطرمة', 'sup-charcuteria', '🥩', 'paquete'],
  ['somon', 'Somon', 'سلمون', 'sup-pescaderia', '🐟', 'kg'],
  ['levrek', 'Levrek', 'قاروص', 'sup-pescaderia', '🐟', 'kg'],
  ['cipura', 'Çipura', 'دنيس', 'sup-pescaderia', '🐟', 'kg'],
  ['hamsi', 'Hamsi', 'أنشوفة', 'sup-pescaderia', '🐟', 'kg'],
  ['ton-baligi', 'Ton balığı konservesi', 'تونة معلبة', 'sup-despensa', '🥫'],

  // Süt ürünleri & yumurta / ألبان وبيض
  ['sut', 'Süt', 'حليب', 'sup-lacteos', '🥛', 'l'],
  ['tam-yagli-sut', 'Tam yağlı süt', 'حليب كامل الدسم', 'sup-lacteos', '🥛', 'l'],
  ['laktozsuz-sut', 'Laktozsuz süt', 'حليب خالي اللاكتوز', 'sup-lacteos', '🥛', 'l'],
  ['ayran', 'Ayran', 'عيران', 'sup-lacteos', '🥛', 'l'],
  ['yogurt', 'Yoğurt', 'لبن زبادي', 'sup-lacteos', '🥣'],
  ['suzme-yogurt', 'Süzme yoğurt', 'لبن مصفّى', 'sup-lacteos', '🥣'],
  ['beyaz-peynir', 'Beyaz peynir', 'جبنة بيضاء', 'sup-lacteos', '🧀', 'paquete'],
  ['kasar-peyniri', 'Kaşar peyniri', 'جبنة قشقوان', 'sup-lacteos', '🧀', 'paquete'],
  ['labne', 'Labne', 'لبنة', 'sup-lacteos', '🧀'],
  ['tereyagi', 'Tereyağı', 'زبدة', 'sup-lacteos', '🧈', 'paquete'],
  ['krema', 'Krema', 'قشطة للطبخ', 'sup-lacteos', '🥛'],
  ['yumurta', 'Yumurta', 'بيض', 'sup-lacteos', '🥚', 'docena'],

  // Fırın / مخبوزات
  ['ekmek', 'Ekmek', 'خبز', 'sup-panaderia', '🍞'],
  ['somun-ekmek', 'Somun ekmek', 'رغيف خبز', 'sup-panaderia', '🍞'],
  ['tam-bugday-ekmegi', 'Tam buğday ekmeği', 'خبز قمح كامل', 'sup-panaderia', '🍞'],
  ['tost-ekmegi', 'Tost ekmeği', 'خبز توست', 'sup-panaderia', '🍞', 'paquete'],
  ['simit', 'Simit', 'سميت', 'sup-panaderia', '🥯'],
  ['pide', 'Pide', 'خبز بيدا', 'sup-panaderia', '🫓'],
  ['yufka', 'Yufka', 'رقائق يوفكا', 'sup-panaderia', '🫓', 'paquete'],
  ['lavaş', 'Lavaş', 'خبز لافاش', 'sup-panaderia', '🫓', 'paquete'],
  ['borek', 'Börek', 'بورك', 'sup-panaderia', '🥐', 'paquete'],

  // Temel gıda / مواد غذائية
  ['pirinc', 'Pirinç', 'أرز', 'sup-despensa', '🍚', 'kg'],
  ['bulgur', 'Bulgur', 'برغل', 'sup-despensa', '🌾', 'kg'],
  ['makarna', 'Makarna', 'معكرونة', 'sup-despensa', '🍝', 'paquete'],
  ['un', 'Un', 'طحين', 'sup-despensa', '🌾', 'kg'],
  ['seker', 'Şeker', 'سكر', 'sup-despensa', '🍬', 'kg'],
  ['tuz', 'Tuz', 'ملح', 'sup-despensa', '🧂'],
  ['karabiber', 'Karabiber', 'فلفل أسود', 'sup-despensa', '🧂'],
  ['kirmizi-mercimek', 'Kırmızı mercimek', 'عدس أحمر', 'sup-despensa', '🫘', 'kg'],
  ['nohut', 'Nohut', 'حمص', 'sup-despensa', '🫘', 'kg'],
  ['kuru-fasulye', 'Kuru fasulye', 'فاصولياء يابسة', 'sup-despensa', '🫘', 'kg'],
  ['zeytinyagi', 'Zeytinyağı', 'زيت زيتون', 'sup-despensa', '🫒', 'l'],
  ['aycicek-yagi', 'Ayçiçek yağı', 'زيت دوار الشمس', 'sup-despensa', '🌻', 'l'],
  ['domates-salcasi', 'Domates salçası', 'معجون طماطم', 'sup-despensa', '🥫'],
  ['biber-salcasi', 'Biber salçası', 'معجون فلفل', 'sup-despensa', '🥫'],
  ['konserve-misir', 'Konserve mısır', 'ذرة معلبة', 'sup-despensa', '🌽'],
  ['zeytin', 'Zeytin', 'زيتون', 'sup-despensa', '🫒'],
  ['tursu', 'Turşu', 'مخللات', 'sup-despensa', '🥒'],
  ['tahin', 'Tahin', 'طحينة', 'sup-despensa', '🥜'],
  ['pekmez', 'Pekmez', 'دبس عنب', 'sup-desayuno', '🍯'],

  // Kahvaltılık, atıştırmalık / فطور ووجبات خفيفة
  ['cay', 'Çay', 'شاي', 'sup-desayuno', '🍵', 'paquete'],
  ['turk-kahvesi', 'Türk kahvesi', 'قهوة تركية', 'sup-desayuno', '☕', 'paquete'],
  ['filtre-kahve', 'Filtre kahve', 'قهوة فلتر', 'sup-desayuno', '☕', 'paquete'],
  ['bal', 'Bal', 'عسل', 'sup-desayuno', '🍯'],
  ['recel', 'Reçel', 'مربى', 'sup-desayuno', '🍓'],
  ['findik-kremasi', 'Fındık kreması', 'كريمة البندق', 'sup-desayuno', '🌰'],
  ['yulaf', 'Yulaf ezmesi', 'شوفان', 'sup-desayuno', '🥣', 'paquete'],
  ['mısır-gevregi', 'Mısır gevreği', 'رقائق الذرة', 'sup-desayuno', '🥣', 'paquete'],
  ['biskuvi', 'Bisküvi', 'بسكويت', 'sup-snacks', '🍪', 'paquete'],
  ['cikolata', 'Çikolata', 'شوكولاتة', 'sup-snacks', '🍫'],
  ['lokum', 'Lokum', 'راحة الحلقوم', 'sup-snacks', '🍬', 'paquete'],
  ['cips', 'Patates cipsi', 'شيبس بطاطا', 'sup-snacks', '🥔', 'paquete'],
  ['findik', 'Fındık', 'بندق', 'sup-snacks', '🌰', 'paquete'],
  ['antep-fistigi', 'Antep fıstığı', 'فستق حلبي', 'sup-snacks', '🥜', 'paquete'],

  // İçecekler / مشروبات
  ['su', 'Su', 'ماء', 'sup-bebidas', '💧', 'l'],
  ['maden-suyu', 'Maden suyu', 'مياه معدنية غازية', 'sup-bebidas', '🫧', 'caja'],
  ['kola', 'Kola', 'كولا', 'sup-bebidas', '🥤', 'l'],
  ['meyve-suyu', 'Meyve suyu', 'عصير فواكه', 'sup-bebidas', '🧃', 'l'],
  ['salgam', 'Şalgam suyu', 'عصير اللفت', 'sup-bebidas', '🥤', 'l'],

  // Dondurulmuş / مجمّدات
  ['dondurulmus-sebze', 'Dondurulmuş sebze', 'خضروات مجمدة', 'sup-congelados', '🥦', 'paquete'],
  ['dondurulmus-patates', 'Dondurulmuş patates', 'بطاطا مجمدة', 'sup-congelados', '🍟', 'paquete'],
  ['dondurulmus-pizza', 'Dondurulmuş pizza', 'بيتزا مجمدة', 'sup-congelados', '🍕'],
  ['dondurma', 'Dondurma', 'بوظة', 'sup-congelados', '🍦'],

  // Temizlik ve kişisel bakım / تنظيف وعناية شخصية
  ['bulasik-deterjani', 'Bulaşık deterjanı', 'سائل جلي', 'sup-limpieza', '🧴'],
  ['camasir-deterjani', 'Çamaşır deterjanı', 'منظف غسيل', 'sup-limpieza', '🧺'],
  ['yumusatici', 'Yumuşatıcı', 'منعّم ملابس', 'sup-limpieza', '🧴'],
  ['camasir-suyu', 'Çamaşır suyu', 'مبيّض', 'sup-limpieza', '🧴'],
  ['yuzey-temizleyici', 'Yüzey temizleyici', 'منظف أسطح', 'sup-limpieza', '🧽'],
  ['cop-torbasi', 'Çöp torbası', 'أكياس قمامة', 'sup-limpieza', '🗑️', 'paquete'],
  ['kagit-havlu', 'Kağıt havlu', 'مناديل مطبخ', 'sup-limpieza', '🧻', 'paquete'],
  ['tuvalet-kagidi', 'Tuvalet kağıdı', 'ورق تواليت', 'sup-higiene', '🧻', 'paquete'],
  ['sampuan', 'Şampuan', 'شامبو', 'sup-higiene', '🧴'],
  ['dus-jeli', 'Duş jeli', 'جل استحمام', 'sup-higiene', '🧴'],
  ['sabun', 'Sabun', 'صابون', 'sup-higiene', '🧼'],
  ['dis-macunu', 'Diş macunu', 'معجون أسنان', 'sup-higiene', '🪥'],
  ['dis-fircasi', 'Diş fırçası', 'فرشاة أسنان', 'sup-higiene', '🪥'],
  ['deodorant', 'Deodorant', 'مزيل عرق', 'sup-higiene', '🧴'],
  ['islak-mendil', 'Islak mendil', 'مناديل مبللة', 'sup-higiene', '🧻', 'paquete'],

  // Bebek ve evcil hayvan / أطفال وحيوانات أليفة
  ['bebek-bezi', 'Bebek bezi', 'حفاضات أطفال', 'sup-bebe', '🍼', 'paquete'],
  ['bebek-mamasi', 'Bebek maması', 'طعام أطفال', 'sup-bebe', '🥣', 'paquete'],
  ['bebek-sutu', 'Bebek sütü', 'حليب أطفال', 'sup-bebe', '🍼', 'paquete'],
  ['kedi-mamasi', 'Kedi maması', 'طعام قطط', 'sup-mascotas', '🐱', 'paquete'],
  ['kopek-mamasi', 'Köpek maması', 'طعام كلاب', 'sup-mascotas', '🐶', 'paquete'],
  ['kedi-kumu', 'Kedi kumu', 'رمل قطط', 'sup-mascotas', '🐱', 'paquete'],

  // Uzman mağazalar / متاجر متخصصة
  ['parasetamol', 'Parasetamol', 'باراسيتامول', 'far-medicacion', '💊', 'paquete'],
  ['ates-olcer', 'Ateş ölçer', 'ميزان حرارة', 'far-medicacion', '🌡️'],
  ['yara-bandi', 'Yara bandı', 'لاصق جروح', 'far-cuidado', '🩹', 'paquete'],
  ['gunes-kremi', 'Güneş kremi', 'واقي شمس', 'far-cuidado', '🧴'],
  ['matkap', 'Matkap', 'مثقاب', 'fer-herramientas', '🛠️'],
  ['tornavida', 'Tornavida', 'مفك', 'fer-herramientas', '🪛'],
  ['vida', 'Vida', 'براغي', 'fer-tornilleria', '🔩', 'paquete'],
  ['pil-aa', 'AA pil', 'بطاريات AA', 'fer-electricidad', '🔋', 'paquete'],
  ['ampul', 'Ampul', 'مصباح كهربائي', 'fer-electricidad', '💡'],
];

// Semt pazarlarında gıdanın yanında yaygın olarak bulunan ihtiyaç ürünleri.
// `storeId` sayesinde yalnızca haftalık Pazar listesinde görünürler.
const PAZAR_PRODUCTS: PazarProduct[] = [
  ['baharat', 'Baharat', 'بهارات', '🌶️', 'paquete'],
  ['kuruyemis', 'Kuruyemiş', 'مكسرات', '🥜', 'paquete'],
  ['cicek', 'Çiçek', 'زهور', '💐'],
  ['tisort', 'Tişört', 'قميص قطني', '👕'],
  ['pantolon', 'Pantolon', 'بنطال', '👖'],
  ['corap', 'Çorap', 'جوارب', '🧦', 'paquete'],
  ['ayakkabi', 'Ayakkabı', 'أحذية', '👟'],
  ['canta', 'Çanta', 'حقيبة', '👜'],
  ['havlu', 'Havlu', 'منشفة', '🧺'],
  ['nevresim', 'Nevresim takımı', 'طقم أغطية سرير', '🛏️', 'paquete'],
  ['mutfak-gerecleri', 'Mutfak gereçleri', 'أدوات مطبخ', '🍳'],
  ['saklama-kabi', 'Saklama kabı', 'علبة حفظ', '🥡'],
  ['kirtasiye', 'Kırtasiye malzemeleri', 'قرطاسية', '✏️', 'paquete'],
  ['oyuncak', 'Oyuncak', 'ألعاب', '🧸'],
];

const tr = mk('tr');
const ar = mk('ar');

export const TR: Product[] = [
  ...PRODUCTS.map(([id, name, , categoryId, emoji, unit]) =>
    tr(id, name, categoryId, emoji, unit),
  ),
  ...PAZAR_PRODUCTS.map(([id, name, , emoji, unit]) => ({
    ...tr(`pazar-${id}`, name, 'sup-otros', emoji, unit),
    storeId: 'tr-pazar',
  })),
];

export const AR: Product[] = [
  ...PRODUCTS.map(([id, , name, categoryId, emoji, unit]) =>
    ar(id, name, categoryId, emoji, unit),
  ),
  ...PAZAR_PRODUCTS.map(([id, , name, emoji, unit]) => ({
    ...ar(`pazar-${id}`, name, 'sup-otros', emoji, unit),
    storeId: 'ar-pazar',
  })),
];
