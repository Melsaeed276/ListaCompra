import type { Locale } from './locale';

const EN = {
  title: 'Home Assistant To-do', list: 'To-do list', none: 'Select a list',
  connect: 'Connect', disconnect: 'Disconnect', refresh: 'Refresh', loading: 'Loading…',
  local: 'Available in Home Assistant', empty: 'No editable to-do lists available',
  linked: 'Connected', lastSync: 'Last sync', owner: 'List owner or administrator only',
  inbox: 'Inbox', failed: 'Sync failed',
};
type Labels = typeof EN;

export const TODO_LABELS: Record<Locale, Labels> = {
  en: EN, us: EN,
  tr: {
    title: 'Home Assistant Yapılacaklar', list: 'Yapılacaklar listesi', none: 'Liste seçin',
    connect: 'Bağlan', disconnect: 'Bağlantıyı kes', refresh: 'Yenile', loading: 'Yükleniyor…',
    local: 'Home Assistant içinde kullanılabilir', empty: 'Düzenlenebilir yapılacaklar listesi yok',
    linked: 'Bağlı', lastSync: 'Son eşitleme', owner: 'Yalnızca liste sahibi veya yönetici',
    inbox: 'Gelen kutusu', failed: 'Eşitleme başarısız',
  },
  ar: {
    title: 'مهام Home Assistant', list: 'قائمة المهام', none: 'اختر قائمة',
    connect: 'ربط', disconnect: 'إلغاء الربط', refresh: 'تحديث', loading: 'جار التحميل…',
    local: 'متاح داخل Home Assistant', empty: 'لا توجد قوائم مهام قابلة للتعديل',
    linked: 'متصل', lastSync: 'آخر مزامنة', owner: 'لمالك القائمة أو المسؤول فقط',
    inbox: 'الوارد', failed: 'فشلت المزامنة',
  },
  es: {
    title: 'Tareas de Home Assistant', list: 'Lista de tareas', none: 'Selecciona una lista',
    connect: 'Conectar', disconnect: 'Desconectar', refresh: 'Actualizar', loading: 'Cargando…',
    local: 'Disponible en Home Assistant', empty: 'No hay listas de tareas editables',
    linked: 'Conectada', lastSync: 'Última sincronización', owner: 'Solo propietario o administrador',
    inbox: 'Bandeja de entrada', failed: 'Error de sincronización',
  },
  fr: {
    title: 'Tâches Home Assistant', list: 'Liste de tâches', none: 'Choisir une liste',
    connect: 'Connecter', disconnect: 'Déconnecter', refresh: 'Actualiser', loading: 'Chargement…',
    local: 'Disponible dans Home Assistant', empty: 'Aucune liste de tâches modifiable',
    linked: 'Connectée', lastSync: 'Dernière synchronisation', owner: 'Propriétaire ou administrateur uniquement',
    inbox: 'Boîte de réception', failed: 'Échec de synchronisation',
  },
  de: {
    title: 'Home Assistant Aufgaben', list: 'Aufgabenliste', none: 'Liste auswählen',
    connect: 'Verbinden', disconnect: 'Trennen', refresh: 'Aktualisieren', loading: 'Laden…',
    local: 'In Home Assistant verfügbar', empty: 'Keine bearbeitbaren Aufgabenlisten',
    linked: 'Verbunden', lastSync: 'Letzte Synchronisierung', owner: 'Nur Eigentümer oder Administrator',
    inbox: 'Posteingang', failed: 'Synchronisierung fehlgeschlagen',
  },
  br: {
    title: 'Tarefas do Home Assistant', list: 'Lista de tarefas', none: 'Selecione uma lista',
    connect: 'Conectar', disconnect: 'Desconectar', refresh: 'Atualizar', loading: 'Carregando…',
    local: 'Disponível no Home Assistant', empty: 'Nenhuma lista de tarefas editável',
    linked: 'Conectada', lastSync: 'Última sincronização', owner: 'Somente proprietário ou administrador',
    inbox: 'Caixa de entrada', failed: 'Falha na sincronização',
  },
};
