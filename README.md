# Modern Ders Yönetim Sistemi (Modern Lesson Management System)

MEB müfredatına uygun, modern ve kullanıcı dostu masaüstü ders programı yönetim sistemi.

## 🎯 Özellikler

### Temel Özellikler
- **Öğretmen Yönetimi**: Öğretmen ekleme, düzenleme, silme ve müsaitlik durumu yönetimi
- **Sınıf Yönetimi**: Sınıf tanımlama, öğrenci sayısı ve derslik ataması
- **Ders Yönetimi**: MEB müfredatına uygun ders tanımlama ve haftalık saat ataması
- **Ders Programı Oluşturma**: Otomatik ve manuel ders programı oluşturma
- **Çakışma Tespiti**: Öğretmen ve sınıf çakışmalarının otomatik tespiti
- **Raporlama**: Detaylı program raporları ve istatistikler

### Teknik Özellikler
- **Cross-Platform**: Windows, macOS ve Linux desteği
- **Modern UI**: Responsive ve kullanıcı dostu arayüz
- **Güvenli Veritabanı**: SQLite ile güvenli veri depolama
- **Yedekleme/Geri Yükleme**: Veritabanı yedekleme ve geri yükleme özellikleri
- **TypeScript**: Type-safe geliştirme ortamı
- **Electron**: Modern web teknolojileri ile masaüstü uygulaması

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+ 
- npm veya yarn
- Windows 10+ / macOS 10.14+ / Ubuntu 18.04+

### Geliştirme Ortamı Kurulumu

1. **Projeyi klonlayın:**
```bash
cd modern-lesson-manager
```

2. **Bağımlılıkları yükleyin:**
```bash
npm install
```

3. **TypeScript kodlarını derleyin:**
```bash
npm run build
```

4. **Uygulamayı geliştirme modunda çalıştırın:**
```bash
npm run dev
```

### Prodüksiyon Kurulumu

1. **Uygulamayı derleyin ve paketleyin:**
```bash
npm run dist
```

2. **Oluşturulan kurulum dosyasını çalıştırın:**
   - Windows: `release/Modern Lesson Manager Setup.exe`
   - macOS: `release/Modern Lesson Manager.dmg`
   - Linux: `release/Modern Lesson Manager.AppImage`

## 📖 Kullanım Kılavuzu

### İlk Kurulum

1. **Uygulamayı başlatın**
2. **Ana sayfa** üzerinden sistem özetini görüntüleyin
3. **Öğretmenler** sekmesinden öğretmen bilgilerini ekleyin
4. **Sınıflar** sekmesinden sınıf bilgilerini tanımlayın
5. **Dersler** sekmesinden ders müfredatını oluşturun
6. **Ders Programı** sekmesinden program oluşturun

### Öğretmen Yönetimi

- **Yeni Öğretmen Ekleme**: "Yeni Öğretmen" butonuna tıklayın
- **Öğretmen Düzenleme**: Tablodaki düzenle butonunu kullanın
- **Müsaitlik Ayarlama**: Takvim butonuna tıklayarak müsaitlik durumunu düzenleyin
- **Öğretmen Silme**: Silme butonuna tıklayın (ders programı olan öğretmenler silinemez)

### Sınıf Yönetimi

- **Yeni Sınıf Ekleme**: "Yeni Sınıf" butonuna tıklayın
- **Sınıf Bilgileri**: Sınıf seviyesi, şube, öğrenci sayısı ve derslik bilgilerini girin
- **Sınıf Düzenleme**: Tablodaki düzenle butonunu kullanın
- **Sınıf Programı Görüntüleme**: Takvim butonuna tıklayın

### Ders Programı Oluşturma

#### Otomatik Program Oluşturma
1. "Otomatik Oluştur" butonuna tıklayın
2. Sistem tüm kısıtlamaları dikkate alarak program oluşturur
3. Çakışmalar varsa uyarı mesajı görüntülenir
4. Program kontrolü yapın ve gerekirse manuel düzenlemeler yapın

#### Manuel Program Düzenleme
1. Sınıf veya öğretmen görünümünü seçin
2. Listeden bir sınıf veya öğretmen seçin
3. Boş zaman dilimlerine tıklayarak ders ekleyin
4. Mevcut dersleri düzenlemek için üzerine tıklayın

### Çakışma Yönetimi

Sistem otomatik olarak şu çakışmaları tespit eder:
- **Öğretmen Çakışması**: Aynı öğretmenin aynı saatte farklı derslerde olması
- **Sınıf Çakışması**: Aynı sınıfın aynı saatte farklı derslerde olması
- **Müsaitlik Çakışması**: Öğretmenin müsait olmadığı saatlerde ders ataması

## 🏗️ Proje Yapısı

```
modern-lesson-manager/
├── src/                          # Ana kaynak kodlar
│   ├── main.ts                   # Electron ana process
│   ├── preload.ts               # Güvenli IPC bridge
│   ├── database/                # Veritabanı yönetimi
│   │   └── DatabaseManager.ts   # SQLite veritabanı yöneticisi
│   └── managers/                # İş mantığı yöneticileri
│       ├── TeacherManager.ts    # Öğretmen yönetimi
│       ├── ClassManager.ts      # Sınıf yönetimi
│       ├── LessonManager.ts     # Ders yönetimi
│       └── ScheduleManager.ts   # Program yönetimi
├── renderer/                    # Frontend kodları
│   ├── index.html              # Ana HTML dosyası
│   ├── styles/                 # CSS stilleri
│   │   └── main.css           # Ana stil dosyası
│   └── scripts/               # JavaScript kodları
│       └── main.js           # Ana frontend logic
├── dist/                       # Derlenmiş TypeScript kodları
├── release/                    # Paketlenmiş uygulamalar
└── assets/                     # Uygulama kaynakları
    └── icons/                  # Uygulama ikonları
```

## 🔧 Geliştirme

### Mevcut Komutlar

```bash
# Geliştirme modunda çalıştır
npm run dev

# TypeScript kodlarını derle
npm run build

# TypeScript kodlarını izle modunda derle
npm run build:watch

# Uygulamayı başlat
npm start

# Uygulamayı paketle (development)
npm run pack

# Uygulamayı paketle (production)
npm run dist
```

### Teknoloji Stack

- **Electron**: Masaüstü uygulama framework'ü
- **TypeScript**: Type-safe JavaScript
- **SQLite**: Hafif veritabanı
- **HTML/CSS/JavaScript**: Modern web teknolojileri
- **Font Awesome**: Icon library
- **Inter Font**: Modern tipografi

### Mimari Kararları

#### Güvenlik
- `nodeIntegration: false` - Node.js entegrasyonu kapalı
- `contextIsolation: true` - Context izolasyonu aktif
- `preload.ts` - Güvenli IPC bridge

#### Veri Yönetimi
- **Manager Pattern**: Her veri türü için ayrı manager sınıfı
- **Repository Pattern**: Veritabanı işlemleri için abstract layer
- **Promise-based**: Asenkron işlemler için Promise kullanımı

#### UI/UX
- **Modern Design**: CSS Grid ve Flexbox ile responsive tasarım
- **Turkish UI**: Türkçe arayüz ve mesajlar
- **Accessibility**: Klavye navigasyonu ve screen reader desteği

## 📊 MEB Müfredatı Desteği

Sistem, 2025-2026 eğitim-öğretim yılı MEB müfredatını destekler:

### Desteklenen Okul Türleri
- **Genel Lise** (9-12. sınıflar)
- **Anadolu Lisesi** (9-12. sınıflar)
- **Fen Lisesi** (9-12. sınıflar)
- **Sosyal Bilimler Lisesi** (9-12. sınıflar)

### Müfredat Özellikleri
- Zorunlu ve seçmeli ders ayrımı
- Haftalık ders saati limitleri
- Sınıf seviyesine göre ders dağılımı
- MEB standartlarına uygunluk kontrolü

## 🐛 Hata Ayıklama

### Yaygın Sorunlar

**1. Uygulama açılmıyor**
- Node.js versiyonunu kontrol edin (18+ gerekli)
- `npm install` komutunu tekrar çalıştırın
- Antivirus yazılımını kontrol edin

**2. Veritabanı hatası**
- Uygulama dosya izinlerini kontrol edin
- Disk alanının yeterli olduğundan emin olun
- Veritabanı yedeklemesini geri yükleyin

**3. Program oluşturulamıyor**
- Öğretmen ve sınıf verilerinin eksiksiz olduğunu kontrol edin
- Öğretmen müsaitlik durumlarını kontrol edin
- Ders müfredatının doğru tanımlandığını kontrol edin

### Log Dosyaları
- **Ana Process**: Electron console
- **Renderer Process**: DevTools console (F12)
- **Database**: SQLite error logs

### Geliştirici Araçları
Geliştirme modunda F12 tuşu ile DevTools'u açabilirsiniz.

## 🤝 Katkıda Bulunma

1. **Fork** edin
2. **Feature branch** oluşturun (`git checkout -b feature/amazing-feature`)
3. **Commit** edin (`git commit -m 'Add amazing feature'`)
4. **Push** edin (`git push origin feature/amazing-feature`)
5. **Pull Request** açın

### Kod Standartları
- TypeScript strict mode kullanın
- ESLint kurallarına uyun
- Türkçe yorum ve değişken isimleri kullanın
- Unit test yazın

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakınız.

## 👥 Ekip

- **Geliştirici**: Modern Lesson Manager Team
- **Tasarım**: Turkish Education Standards
- **Test**: MEB Curriculum Compliance

## 📞 Destek

Sorularınız için:
- **GitHub Issues**: Bug raporları ve özellik istekleri
- **Documentation**: Bu README dosyası
- **Community**: GitHub Discussions

## 🗺️ Yol Haritası

### v1.1 (Planlanıyor)
- [ ] Gelişmiş raporlama özellikleri
- [ ] PDF export desteği
- [ ] Multi-language support
- [ ] Dark mode

### v1.2 (Planlanıyor)
- [ ] Cloud sync desteği
- [ ] Mobile app entegrasyonu
- [ ] Gelişmiş optimizasyon algoritmaları
- [ ] Bulk operations

### v1.3 (Planlanıyor)
- [ ] AI-powered schedule optimization
- [ ] Integration with MEB systems
- [ ] Advanced analytics
- [ ] Real-time collaboration

---

**Modern Ders Yönetim Sistemi** - Türk eğitim sistemi için modern, güvenilir ve kullanıcı dostu ders programı yönetimi.
