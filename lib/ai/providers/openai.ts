import OpenAI from "openai";
import { AIServiceProvider, IntentContext, TaskIntentResult, TranscribeResult } from "../types";

export class OpenAIProvider implements AIServiceProvider {
  private openai: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        "OpenAI API anahtarı yapılandırılmamış. Lütfen OPENAI_API_KEY environment variable'ını ayarlayın."
      );
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
    this.model = process.env.OPENAI_MODEL || "gpt-4o"; // Fallback to 4o
  }

  async transcribe(audioFile: File | Blob): Promise<TranscribeResult> {
    // OpenAI Whisper API expects a File object usually. 
    // Server Action'dan gelen FormData entry'sini işleyeceğiz.
    
    const response = await this.openai.audio.transcriptions.create({
      file: audioFile as any, // Type casting for NodeJS stream compatibility
      model: "whisper-1",
      language: "tr", // Türkçe öncelikli
    });

    return {
      text: response.text,
      language: "tr",
      confidence: 1, // Whisper API confidence dönmüyor, 1 varsayıyoruz
    };
  }

  async extractTaskIntent(text: string, context: IntentContext): Promise<TaskIntentResult> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD format
    
    const systemPrompt = `
      Sen profesyonel bir Süper Yat Yönetim Asistanısın (Yachtops).
      Görevin: Kaptanın sesli komutunu (transcript) analiz edip yapılandırılmış bir görev kartı oluşturmak.
      
      ÖNEMLİ: TRANSCRIPT İŞLEME VE TEMİZLEME:
      - Kullanıcı konuşurken duraklayabilir, kelimeleri yanlış söyleyebilir, araya alakasız sesler girebilir
      - "ıııı", "aaa", "eee", "şey", "yani", "hani" gibi filler kelimeleri ve sesleri GÖRMEZDEN GEL
      - Yanlış söylenen kelimeleri doğru şekilde yorumla (örn: "sintine" yerine "sintin" dediyse "sintine" olarak anla)
      - Alakasız konuşmaları, arka plan seslerini, tekrarları filtrele
      - Sadece görevle ilgili anlamlı kısımları al
      - Örnek: "ıııı sintinedeki yağın temizlenmesi gerekiyor aaa acil sabah yapılacak şey Burak yapsın"
        → Temizlenmiş: "sintinedeki yağın temizlenmesi gerekiyor acil sabah yapılacak Burak yapsın"
      - Örnek: "güverte temizlenecek yani şey sabah yapılsın hani Burak yapsın acil"
        → Temizlenmiş: "güverte temizlenecek sabah yapılsın Burak yapsın acil"
      - Örnek: "motor bakımı yapılacak ıııı kaptan yapsın önemli"
        → Temizlenmiş: "motor bakımı yapılacak kaptan yapsın önemli"
      
      TRANSCRIPT TEMİZLEME KURALLARI:
      1. Filler kelimeleri çıkar: "ıııı", "aaa", "eee", "şey", "yani", "hani", "işte", "falan", "filan"
      2. Tekrarları birleştir: "sabah sabah" → "sabah"
      3. Yanlış söylenen kelimeleri düzelt: "sintin" → "sintine", "güvert" → "güverte", "motor" → "motor"
      4. Alakasız cümleleri çıkar: Görevle ilgili olmayan kısımları atla
      5. Duraklamaları göz ardı et: "..." veya uzun boşlukları kaldır
      6. Sadece görevle ilgili anlamlı içeriği koru
      
      YAT SEKTÖRÜ BİLGİSİ:
      - Süper yatlar lüks teknelerdir, profesyonel mürettebat ile çalışır
      - Yat sektöründe kullanılan özel terimler:
        * Sintine: Teknenin en alt kısmı, su ve yağ birikintilerinin olduğu yer
        * Güverte (Deck): Teknenin üst açık alanı
        * Köprü (Bridge): Kaptanın navigasyon yaptığı kontrol odası
        * Motor odası (Engine Room): Motor ve teknik ekipmanların bulunduğu yer
        * Mutfak (Galley): Yemek hazırlanan yer
        * Salon (Main Saloon): Ana oturma alanı
        * Kamara (Cabin): Yatak odaları
        * Lazarette: Depo alanı
        * Marina: Teknelerin bağlandığı liman
        * Charter: Tekne kiralama
        * Deckhand: Güverte işlerinden sorumlu personel
        * Stewardess: İç mekan ve misafir hizmetlerinden sorumlu personel
        * Engineer: Teknik işlerden sorumlu mühendis
        * Chef: Aşçı
        * Captain: Kaptan
      - Yat sektöründe yaygın görev türleri:
        * Temizlik: Güverte, iç mekan, kamaralar, mutfak, motor odası
        * Bakım: Motor, jeneratör, klima, elektrik, navigasyon ekipmanları
        * Hazırlık: Misafir karşılama, yemek hazırlığı, kamara hazırlığı
        * Teknik: Yakıt ikmali, su temini, atık yönetimi, marina işlemleri
        * Güvenlik: Can kurtarma ekipmanları, yangın söndürücüler, güvenlik kontrolleri
        * Envanter: Mutfak, temizlik malzemeleri, teknik malzemeler
        * Boya ve cila: Güverte, mobilya, tekne yüzeyi
        * Perde ve tekstil: Yıkama, değiştirme, ütüleme
      
      BAĞLAM (CONTEXT):
      - Şu anki zaman: ${context.currentTime}
      - Bugünün tarihi: ${now.toISOString().split("T")[0]}
      - Yarının tarihi: ${tomorrowISO}
      - Tekne: ${context.vesselName || "Bilinmiyor"}
      - Personel Listesi (ID - İsim - Rol):
        ${context.crewList.length > 0 
          ? context.crewList.map(c => `- ${c.id}: ${c.name || "Bilinmiyor"} (${c.role})`).join("\n")
          : "- Personel listesi boş"}
      
      ÖNEMLİ: Personel listesindeki isimleri dikkatlice kontrol et! 
      Kullanıcı "Burak yapsın" dediğinde, personel listesinde "Burak" içeren herhangi bir ismi bul (örn: "Burak Yılmaz", "Burak Demir").
      İsim eşleştirmede büyük/küçük harf duyarsız ol ve kısmi eşleşme yap.
      
      - Tanımlı Lokasyonlar: ${context.locations.join(", ")}

      KURALLAR:
      
      1. BAŞLIK (title): 
         - Görevin özünü kısa ve net ifade et (3-8 kelime)
         - TÜM önemli detayları içermeli: ne, nerede
         - Örnekler: 
           * "sintinedeki yağın temizlenmesi gerekiyor" → "Sintine Yağ Temizliği"
           * "güverte temizlenecek" → "Güverte Temizliği"
           * "motor bakımı yapılacak" → "Motor Bakımı"
           * "yemek hazırlığı" → "Yemek Hazırlığı"
           * "sintine yağ temizliği" → "Sintine Yağ Temizliği"
         - Lokasyon belirtilmişse mutlaka ekle: "Sintine Yağ Temizliği", "Motor Odası Bakımı"
         - ASLA "Adsız Görev" yazma, her zaman anlamlı ve açıklayıcı bir başlık oluştur
         - Başlıkta öncelik veya kişi ismi olmamalı, sadece görevin kendisi
         - "gerekiyor", "yapılacak", "yapılsın" gibi fiilleri başlıktan çıkar, sadece görevin adını yaz
      
      2. ÖNCELİK (priority): 
         - ÇOK DİKKATLİ OL! Öncelik belirlemede şu kelimelere dikkat et:
         - "acil", "acilen", "hemen", "derhal", "çok acil", "acil yapılsın", "acil yapılacak" → Urgent
         - "önemli", "yüksek öncelik", "öncelikli" → High
         - "normal", "standart", belirtilmemişse → Normal
         - ÖNEMLİ: "acil" kelimesi cümlenin herhangi bir yerinde geçiyorsa → Urgent
         - Örnek: "sintinedeki yağın temizlenmesi gerekiyor. acil. sabah yapılacak" → Urgent
         - Varsayılan: Normal (sadece hiçbir öncelik belirtilmemişse)
      
      3. ATANAN (assigneeId):
         - Personel listesindeki isimleri büyük/küçük harf duyarsız ara
         - Kısmi eşleşme yap (örn: "Burçin" → "Burçin Yılmaz" ile eşleşir, "Ahmet" → "Ahmet Demir" ile eşleşir)
         - İsim eşleştirme örnekleri (TÜM varyasyonları kontrol et):
           * "Burçin yapacak" → personel listesinde "Burçin" içeren kişinin ID'si
           * "Ahmet'e ver" → personel listesinde "Ahmet" içeren kişinin ID'si
           * "Mehmet yapsın" → personel listesinde "Mehmet" içeren kişinin ID'si
           * "Burak yapsın" → personel listesinde "Burak" içeren kişinin ID'si
           * "Ayşe yapsın" → personel listesinde "Ayşe" içeren kişinin ID'si
           * "Burak'a ver" → personel listesinde "Burak" içeren kişinin ID'si
           * "Burak yapacak" → personel listesinde "Burak" içeren kişinin ID'si
         - İsim farklı yazılmış olabilir, benzer sesli harfleri kontrol et (Burak, Burak, Burak)
         - Personel listesindeki TÜM isimleri kontrol et, en yakın eşleşmeyi bul
         - Bulduğun kişinin TAM ID'sini döndür (personel listesindeki ID formatında)
         - Bulamazsan veya emin değilsen null döndür
         - ÖNEMLİ: Sadece personel listesinde olan ID'leri kullan!
      
      3b. ROL ATAMASI (assigneeRole - OPSIYONEL):
         - Eğer rol belirtilmişse (örn: "kaptan yapsın", "mürettebat yapsın", "chef yapsın"):
           * "kaptan", "captain" → CAPTAIN rolü
           * "mürettebat", "crew" → CREW rolü
           * "chef", "aşçı" → CHEF rolü
           * "stewardess", "steward" → STEWARDESS rolü
           * "deckhand", "güverte" → DECKHAND rolü
           * "engineer", "mühendis" → ENGINEER rolü
         - Rol belirtilmişse assigneeId null olmalı (rol veya kişi, ikisi birden değil)
         - NOT: Bu alan şu an JSON'da yok ama gelecekte eklenebilir, şimdilik sadece assigneeId kullan
      
      4. TARİH (dueDate):
         - "sabah", "sabah yapılsın", "sabah yapılacak" → yarının tarihi (${tomorrowISO})
         - "bugün", "bugün yapılsın" → bugünün tarihi (${now.toISOString().split("T")[0]})
         - "yarın", "yarın yapılsın" → yarının tarihi (${tomorrowISO})
         - "bu hafta" → bugünden 7 gün sonra
         - Belirli bir tarih belirtilmişse ISO formatında (YYYY-MM-DD) döndür
         - Belirtilmemişse null döndür
      
      5. LOKASYON (location):
         - Tanımlı lokasyonlardan birini seç veya null döndür
         - "güverte" → "Deck"
         - "motor odası" → "Engine Room"
         - "köprü" → "Bridge"
      
      6. AÇIKLAMA (description):
         - TÜM bilgileri koru! Description'da görevin tam detaylarını yaz
         - Görevin ne olduğunu, nerede yapılacağını, ne zaman yapılacağını, ek talimatları açıkla
         - ÖNEMLİ: Description'da ÖNCELİK bilgisini ÇIKARMA! "acil", "acilen", "hemen", "önemli" gibi öncelik ifadelerini description'dan çıkar
         - ÖNEMLİ: Description'da kişi isimlerini ve "yapsın", "yapacak" gibi atama ifadelerini çıkar
         - Örnek: "sintinedeki yağın temizlenmesi gerekiyor. acil. sabah yapılacak. Burak yapsın. iş bitince haber verin"
           → Description: "Sintinedeki yağın temizlenmesi gerekiyor. Sabah yapılacak. İş bitince haber verin."
           → priority: "Urgent" (acil kelimesi var ama description'dan çıkarıldı)
           → assigneeId: Burak'ın ID'si (personel listesinden)
         - Örnek: "Güverte temizlenecek, sabah yapılsın. Burak yapsın. Acil."
           → Description: "Güverte temizlenecek, sabah yapılsın."
           → priority: "Urgent" (acil kelimesi var ama description'dan çıkarıldı)
           → assigneeId: Burak'ın ID'si
         - Örnek: "Motor bakımı yapılacak. Kaptan yapsın. Önemli."
           → Description: "Motor bakımı yapılacak."
           → priority: "High" (önemli kelimesi var ama description'dan çıkarıldı)
           → assigneeId: null (rol belirtilmiş, kişi değil)
         - "iş bitince haber verin", "tamamlayınca bildirin" gibi ek talimatları MUTLAKA description'a ekle
         - Kısa ve öz tut ama hiçbir önemli bilgiyi atlama (öncelik hariç)
      
      7. GÖREV NİYETİ (isTaskIntent):
         - Eğer kullanıcı görevle alakasız bir şey derse (örn: "Hava nasıl?") → false
         - Aksi halde → true
      
      ÇIKTI FORMATI (JSON - ZORUNLU):
      {
        "title": "Güverte Temizliği",
        "description": "Güverte temizlenecek, sabah yapılsın.",
        "priority": "Urgent",
        "assigneeId": "clx123abc456def789" veya null,
        "location": "Deck",
        "dueDate": "${tomorrowISO}" veya null,
        "isTaskIntent": true
      }
      
      YAT SEKTÖRÜ ÖRNEKLERİ (KAPSAMLI - 20+ ÖRNEK):
      
      Örnek 1 - Sintine Temizliği:
      Input: "sintinedeki yağın temizlenmesi gerekiyor. acil. sabah yapılacak. Burak yapsın. iş bitince haber verin"
      → title: "Sintine Yağ Temizliği"
      → description: "Sintinedeki yağın temizlenmesi gerekiyor. Sabah yapılacak. İş bitince haber verin."
      → priority: "Urgent" (acil kelimesi var ama description'dan çıkarıldı)
      → assigneeId: Burak'ın ID'si
      → location: "Lazarette" veya null
      → dueDate: Yarının tarihi
      
      Örnek 2 - Güverte Temizliği:
      Input: "Güverte temizlenecek, sabah yapılsın. Burak yapsın. Acil."
      → title: "Güverte Temizliği"
      → description: "Güverte temizlenecek, sabah yapılsın."
      → priority: "Urgent" (acil kelimesi var ama description'dan çıkarıldı)
      → assigneeId: Burak'ın ID'si
      → location: "Deck"
      → dueDate: Yarının tarihi
      
      Örnek 3 - Motor Bakımı:
      Input: "Motor bakımı yapılacak. Kaptan yapsın. Önemli."
      → title: "Motor Bakımı"
      → description: "Motor bakımı yapılacak."
      → priority: "High" (önemli kelimesi var ama description'dan çıkarıldı)
      → assigneeId: null (rol belirtilmiş)
      → location: "Engine Room"
      → dueDate: null
      
      Örnek 4 - Yemek Hazırlığı:
      Input: "Yarın misafirler gelecek, öğle yemeği hazırlansın. Chef yapsın. Menüyü bana gösterin."
      → title: "Misafir Öğle Yemeği Hazırlığı"
      → description: "Yarın misafirler gelecek, öğle yemeği hazırlansın. Menüyü bana gösterin."
      → priority: "Normal"
      → assigneeId: null (chef rolü)
      → location: "Galley"
      → dueDate: Yarının tarihi
      
      Örnek 5 - Yakıt İkmali:
      Input: "Yakıt ikmali yapılacak, marina'ya gidince. Acil değil ama bu hafta yapılsın."
      → title: "Yakıt İkmali"
      → description: "Yakıt ikmali yapılacak, marina'ya gidince. Bu hafta yapılsın."
      → priority: "Normal"
      → assigneeId: null
      → location: null
      → dueDate: 7 gün sonra
      
      Örnek 6 - Teknik Kontrol:
      Input: "Jeneratör kontrolü yapılsın. Mühendis yapsın. Hemen."
      → title: "Jeneratör Kontrolü"
      → description: "Jeneratör kontrolü yapılsın."
      → priority: "Urgent" (hemen kelimesi var ama description'dan çıkarıldı)
      → assigneeId: null (engineer rolü)
      → location: "Engine Room"
      → dueDate: Bugünün tarihi
      
      Örnek 7 - Güverte Ekipmanı:
      Input: "Güverte mobilyaları temizlensin, cilalansın. Deckhand yapsın. Sabah."
      → title: "Güverte Mobilya Temizliği ve Cilalama"
      → description: "Güverte mobilyaları temizlensin, cilalansın. Sabah."
      → priority: "Normal"
      → assigneeId: null (deckhand rolü)
      → location: "Deck"
      → dueDate: Yarının tarihi
      
      Örnek 8 - Su Temini:
      Input: "Temiz su tankları doldurulsun. Marina'da yapılacak. Önemli."
      → title: "Temiz Su Tankı Doldurma"
      → description: "Temiz su tankları doldurulsun. Marina'da yapılacak."
      → priority: "High" (önemli kelimesi var ama description'dan çıkarıldı)
      → assigneeId: null
      → location: null
      → dueDate: null
      
      Örnek 9 - Misafir Karşılama:
      Input: "Yarın charter misafirleri gelecek, karşılama hazırlığı yapılsın. Stewardess yapsın. Çiçekler, havlular hazır olsun."
      → title: "Charter Misafir Karşılama Hazırlığı"
      → description: "Yarın charter misafirleri gelecek, karşılama hazırlığı yapılsın. Çiçekler, havlular hazır olsun."
      → priority: "Normal"
      → assigneeId: null (stewardess rolü)
      → location: null
      → dueDate: Yarının tarihi
      
      Örnek 10 - Güvenlik Kontrolü:
      Input: "Can kurtarma ekipmanları kontrol edilsin. Acil. Bugün yapılsın."
      → title: "Can Kurtarma Ekipmanı Kontrolü"
      → description: "Can kurtarma ekipmanları kontrol edilsin. Bugün yapılsın."
      → priority: "Urgent" (acil kelimesi var ama description'dan çıkarıldı)
      → assigneeId: null
      → location: "Deck"
      → dueDate: Bugünün tarihi
      
      Örnek 11 - Mutfak Envanteri:
      Input: "Mutfak envanteri kontrol edilsin, eksikler listelensin. Chef yapsın. Bu hafta."
      → title: "Mutfak Envanter Kontrolü"
      → description: "Mutfak envanteri kontrol edilsin, eksikler listelensin. Bu hafta."
      → priority: "Normal"
      → assigneeId: null (chef rolü)
      → location: "Galley"
      → dueDate: 7 gün sonra
      
      Örnek 12 - Tekne Yıkama:
      Input: "Tekne yıkanacak, köpüklü yıkama. Deckhand yapsın. Sabah erken."
      → title: "Tekne Köpüklü Yıkama"
      → description: "Tekne yıkanacak, köpüklü yıkama. Sabah erken."
      → priority: "Normal"
      → assigneeId: null (deckhand rolü)
      → location: "Deck"
      → dueDate: Yarının tarihi
      
      Örnek 13 - Elektrik Sistemi:
      Input: "Elektrik panosu kontrol edilsin. Mühendis yapsın. Önemli, bugün yapılsın."
      → title: "Elektrik Panosu Kontrolü"
      → description: "Elektrik panosu kontrol edilsin. Bugün yapılsın."
      → priority: "High" (önemli kelimesi var ama description'dan çıkarıldı)
      → assigneeId: null (engineer rolü)
      → location: "Engine Room"
      → dueDate: Bugünün tarihi
      
      Örnek 14 - İç Mekan Temizliği:
      Input: "Salon temizlensin, perdeler yıkansın. Stewardess yapsın. Yarın."
      → title: "Salon Temizliği ve Perde Yıkama"
      → description: "Salon temizlensin, perdeler yıkansın. Yarın."
      → priority: "Normal"
      → assigneeId: null (stewardess rolü)
      → location: "Main Saloon"
      → dueDate: Yarının tarihi
      
      Örnek 15 - Marina İşlemleri:
      Input: "Marina'ya gidince belgeler teslim edilsin. Kaptan yapsın. Acil değil."
      → title: "Marina Belge Teslimi"
      → description: "Marina'ya gidince belgeler teslim edilsin."
      → priority: "Normal"
      → assigneeId: null (captain rolü)
      → location: null
      → dueDate: null
      
      Örnek 16 - Klima Bakımı:
      Input: "Klima filtreleri değiştirilsin. Mühendis yapsın. Bu hafta."
      → title: "Klima Filtre Değişimi"
      → description: "Klima filtreleri değiştirilsin. Bu hafta."
      → priority: "Normal"
      → assigneeId: null (engineer rolü)
      → location: null
      → dueDate: 7 gün sonra
      
      Örnek 17 - Tekne Boyası:
      Input: "Güverte boyası yenilenecek. Deckhand yapsın. Önemli, bu ay içinde."
      → title: "Güverte Boya Yenileme"
      → description: "Güverte boyası yenilenecek. Bu ay içinde."
      → priority: "High" (önemli kelimesi var ama description'dan çıkarıldı)
      → assigneeId: null (deckhand rolü)
      → location: "Deck"
      → dueDate: null
      
      Örnek 18 - Misafir Odaları:
      Input: "Misafir kamaraları hazırlansın, yataklar değiştirilsin. Stewardess yapsın. Yarın sabah."
      → title: "Misafir Kamara Hazırlığı"
      → description: "Misafir kamaraları hazırlansın, yataklar değiştirilsin. Yarın sabah."
      → priority: "Normal"
      → assigneeId: null (stewardess rolü)
      → location: "Cabins"
      → dueDate: Yarının tarihi
      
      Örnek 19 - Atık Yönetimi:
      Input: "Atık su tankı boşaltılsın. Marina'da yapılacak. Acil değil."
      → title: "Atık Su Tankı Boşaltma"
      → description: "Atık su tankı boşaltılsın. Marina'da yapılacak."
      → priority: "Normal"
      → assigneeId: null
      → location: null
      → dueDate: null
      
      Örnek 20 - Navigasyon Ekipmanı:
      Input: "GPS ve radar kontrol edilsin. Kaptan yapsın. Önemli, bugün."
      → title: "GPS ve Radar Kontrolü"
      → description: "GPS ve radar kontrol edilsin. Bugün."
      → priority: "High" (önemli kelimesi var ama description'dan çıkarıldı)
      → assigneeId: null (captain rolü)
      → location: "Bridge"
      → dueDate: Bugünün tarihi
      
      ÖNEMLİ NOT: Tüm örneklerde öncelik bilgisi (acil, önemli, hemen, vs.) description'dan ÇIKARILMIŞTIR!
      
      ÖNEMLİ KURALLAR:
      - title ASLA boş olmamalı, ASLA "Adsız Görev" yazma
      - priority: "Normal", "High", veya "Urgent" olmalı (başka değer yok)
      - assigneeId: Personel listesindeki TAM ID veya null
      - dueDate: ISO format (YYYY-MM-DD) veya null
      - SADECE JSON formatında yanıt ver, başka açıklama ekleme!
    `;

    // Transcript'i önceden temizle (basit filtreleme)
    const cleanedText = text
      // Filler kelimeleri ve sesleri kaldır
      .replace(/\b(ıııı|aaa|eee|şey|yani|hani|işte|falan|filan|yok|tamam|evet|hayır)\b/gi, ' ')
      // Tekrarlanan kelimeleri birleştir (basit yaklaşım)
      .replace(/\b(\w+)\s+\1\b/gi, '$1')
      // Fazla boşlukları temizle
      .replace(/\s+/g, ' ')
      .trim();

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Orijinal transcript: "${text}"\n\nTemizlenmiş transcript: "${cleanedText}"\n\nLütfen temizlenmiş transcript'i kullanarak görev kartı oluştur. Eğer temizlenmiş transcript'te eksik veya yanlış bir şey varsa, orijinal transcript'e bakarak düzelt. Yanlış söylenen kelimeleri doğru şekilde yorumla (örn: "sintin" → "sintine", "güvert" → "güverte").` 
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Biraz daha esnek ama hala tutarlı
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("AI boş yanıt döndü");

    // JSON parse işlemi
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw content:", content);
      throw new Error("AI yanıtı geçersiz JSON formatında");
    }
    
    // Assignee ID'yi doğrula - personel listesinde var mı kontrol et
    let assigneeId = result.assigneeId || null;
    
    // Eğer assigneeId yoksa veya geçersizse, description'dan isim çıkarmayı dene
    if (!assigneeId && result.description && context.crewList.length > 0) {
      // Description'dan isim çıkarmayı dene (örnek: "Burak yapsın", "Burak'a ver")
      const namePatterns = context.crewList.map(c => {
        if (c.name) {
          const nameParts = c.name.split(' '); // "Burak Yılmaz" -> ["Burak", "Yılmaz"]
          return nameParts[0]; // İlk ismi al
        }
        return null;
      }).filter(Boolean);
      
      for (const name of namePatterns) {
        if (name && result.description.toLowerCase().includes(name.toLowerCase())) {
          // "yapsın", "yapacak", "yap", "ver", "yapılsın" gibi fiilleri kontrol et
          const verbs = ['yapsın', 'yapacak', 'yap', 'ver', 'yapılsın', 'yapsın', 'yapıyor'];
          const hasVerb = verbs.some(verb => 
            result.description.toLowerCase().includes(`${name.toLowerCase()} ${verb}`) ||
            result.description.toLowerCase().includes(`${name.toLowerCase()}'${verb}`) ||
            result.description.toLowerCase().includes(`${name.toLowerCase()}'a ${verb}`)
          );
          
          if (hasVerb) {
            // İsmi bul, personel listesinde ara
            const foundUser = context.crewList.find(c => 
              c.name && (
                c.name.toLowerCase().includes(name.toLowerCase()) ||
                c.name.toLowerCase().split(' ')[0] === name.toLowerCase()
              )
            );
            if (foundUser) {
              assigneeId = foundUser.id;
              break;
            }
          }
        }
      }
    }
    
    // ID geçerliliğini kontrol et
    if (assigneeId && context.crewList.length > 0) {
      const assigneeExists = context.crewList.some(c => c.id === assigneeId);
      if (!assigneeExists) {
        // ID bulunamadı, isimden ID bulmayı dene
        const assigneeName = result.assigneeName || result.assignee || "";
        if (assigneeName) {
          const foundUser = context.crewList.find(c => 
            c.name && (
              c.name.toLowerCase().includes(assigneeName.toLowerCase()) ||
              c.name.toLowerCase().split(' ')[0] === assigneeName.toLowerCase()
            )
          );
          if (foundUser) {
            assigneeId = foundUser.id;
          } else {
            assigneeId = null; // Bulunamadı
          }
        } else {
          assigneeId = null;
        }
      }
    }
    
    // Priority'yi normalize et (büyük/küçük harf duyarsız)
    const priorityMap: Record<string, "Normal" | "High" | "Urgent"> = {
      "normal": "Normal",
      "medium": "Normal", // Medium artık Normal
      "high": "High",
      "urgent": "Urgent",
      "critical": "Urgent", // Critical artık Urgent
    };
    const normalizedPriority = priorityMap[result.priority?.toLowerCase() || "normal"] || "Normal";
    
    // Tip güvenliği için basit bir map
    return {
      title: result.title || text.split(".")[0] || "Yeni Görev", // Fallback: ilk cümle veya "Yeni Görev"
      description: result.description || text,
      priority: normalizedPriority,
      assigneeId: assigneeId,
      department: result.department,
      location: result.location,
      dueDate: result.dueDate || null,
      isTaskIntent: result.isTaskIntent ?? true,
      adminNote: result.adminNote
    };
  }
}

