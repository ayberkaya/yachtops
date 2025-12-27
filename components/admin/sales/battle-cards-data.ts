// Battle Cards Data - FAQ & Objection Handling for Sales Team
// This will be moved to database later

export interface BattleCard {
  question: string;
  answer: string;
  category: "pricing" | "features" | "competition" | "technical" | "general";
  tags?: string[];
}

export const battleCards: BattleCard[] = [
  {
    question: "Neden X rakibinden pahalısınız?",
    answer: "Çünkü bizde offline-first mimari ve tam tenant izolasyonu var. Müşterileriniz verilerinin tamamen izole olduğundan ve internet bağlantısı olmasa bile sistemin çalışmaya devam edeceğinden emin olabilirler. Bu, yat operasyonları için kritik bir özelliktir.",
    category: "pricing",
    tags: ["fiyat", "rekabet", "değer önerisi"],
  },
  {
    question: "Offline çalışma ne demek?",
    answer: "Offline-first mimari, internet bağlantısı olmasa bile sistemin tam fonksiyonel çalışması demektir. Açık denizlerde veya limanlarda zayıf bağlantıda bile tüm özellikler (harcama takibi, görev yönetimi, envanter) sorunsuz çalışır. Veriler yerel olarak saklanır ve bağlantı geldiğinde otomatik senkronize olur.",
    category: "technical",
    tags: ["offline", "teknik", "özellik"],
  },
  {
    question: "Tenant izolasyonu neden önemli?",
    answer: "Her müşterinin verisi tamamen ayrı bir veritabanı bölümünde saklanır. Bu, güvenlik ve performans açısından kritiktir. Bir müşterinin verisi asla başka bir müşteriye sızamaz. Ayrıca, bir müşterideki yüksek trafik diğer müşterileri etkilemez.",
    category: "technical",
    tags: ["güvenlik", "izolasyon", "performans"],
  },
  {
    question: "Küçük bir yatımız var, Essentials yeterli mi?",
    answer: "Essentials paketi 30m altı yatlar için tasarlandı ve temel ihtiyaçları karşılar: harcama takibi, temel doküman yönetimi, mürettebat yönetimi ve görev yönetimi. Eğer ileride büyüme planınız varsa, kolayca Professional'a geçiş yapabilirsiniz.",
    category: "features",
    tags: ["paket seçimi", "küçük yat", "essentials"],
  },
  {
    question: "Enterprise paketinde ne fark var?",
    answer: "Enterprise paketi 60m+ yatlar ve filolar için özel olarak tasarlanmıştır. Özel hesap yöneticisi, 7/24 destek, özel özellik geliştirme, sahada eğitim ve API erişimi içerir. Fiyatlandırma özel ihtiyaçlara göre belirlenir.",
    category: "features",
    tags: ["enterprise", "büyük yat", "özel çözüm"],
  },
  {
    question: "Verilerimiz nerede saklanıyor?",
    answer: "Verileriniz GDPR uyumlu, şifreli Supabase veritabanında saklanır. Sunucular AB ve ABD'de bulunur. Her müşterinin verisi tamamen izole edilmiştir (tenant isolation). Verileriniz asla üçüncü taraflarla paylaşılmaz.",
    category: "technical",
    tags: ["güvenlik", "veri saklama", "GDPR"],
  },
  {
    question: "Mevcut sistemimizden veri aktarımı yapabilir miyiz?",
    answer: "Evet, Professional ve Enterprise paketlerinde veri aktarım desteği sunuyoruz. Excel, CSV veya API üzerinden mevcut verilerinizi aktarabiliriz. Enterprise müşterileri için özel aktarım projeleri de yapıyoruz.",
    category: "features",
    tags: ["migrasyon", "veri aktarımı", "entegrasyon"],
  },
  {
    question: "Mobil uygulama var mı?",
    answer: "Evet, sistemimiz PWA (Progressive Web App) teknolojisi ile çalışır. iOS ve Android cihazlarda native uygulama gibi çalışır, ana ekrana eklenebilir ve offline çalışır. Ayrıca push notification desteği de vardır.",
    category: "technical",
    tags: ["mobil", "PWA", "offline"],
  },
  {
    question: "Kurulum ve eğitim süreci nasıl?",
    answer: "Essentials ve Professional paketlerinde online onboarding ve video eğitimler sunuyoruz. Enterprise paketinde ise özel hesap yöneticiniz sahada eğitim verir ve kurulum sürecini yönetir. Tüm paketlerde ilk hafta öncelikli destek sağlanır.",
    category: "general",
    tags: ["kurulum", "eğitim", "onboarding"],
  },
  {
    question: "İptal politikası nedir?",
    answer: "Aylık aboneliklerde 30 günlük iptal bildirimi yeterlidir. Yıllık aboneliklerde erken iptal durumunda kalan süre oranında iade yapılır. Enterprise paketlerinde özel sözleşme koşulları geçerlidir.",
    category: "general",
    tags: ["iptal", "iade", "sözleşme"],
  },
];

