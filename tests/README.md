# Test Suite - Seçmeli Ders Atama Takip Sistemi

Bu klasör, seçmeli ders atama takip sistemi için kapsamlı test suite'ini içerir.

## Test Yapısı

```
tests/
├── backend/                 # Backend unit testleri
│   ├── ElectiveTrackerManager.test.js
│   ├── AssignmentAlertManager.test.js
│   └── SuggestionEngine.test.js
├── frontend/                # Frontend integration testleri
│   ├── ElectiveAlertManager.test.js
│   ├── ElectiveTracker.test.js
│   └── QuickAssignmentPanel.test.js
├── jest.config.js          # Jest konfigürasyonu
├── setup.js               # Test setup dosyası
└── README.md              # Bu dosya
```

## Test Komutları

### Tüm testleri çalıştır
```bash
npm test
```

### Testleri watch modunda çalıştır
```bash
npm run test:watch
```

### Coverage raporu ile testleri çalıştır
```bash
npm run test:coverage
```

### Sadece backend testlerini çalıştır
```bash
npm run test:backend
```

### Sadece frontend testlerini çalıştır
```bash
npm run test:frontend
```

## Test Kapsamı

### Backend Unit Testleri

#### ElectiveTrackerManager
- ✅ Seçmeli ders durumu güncelleme
- ✅ Sınıf durumu sorgulama
- ✅ Tüm durumları listeleme
- ✅ Eksik atamaları bulma
- ✅ İstatistik hesaplama
- ✅ Ders dağılımı analizi
- ✅ Toplu durum yenileme

#### AssignmentAlertManager
- ✅ Uyarı oluşturma
- ✅ Uyarı şiddeti güncelleme
- ✅ Uyarı çözme
- ✅ Sınıf bazında uyarı sorgulama
- ✅ Kritik uyarıları listeleme
- ✅ Aktif uyarıları listeleme
- ✅ Uyarı istatistikleri
- ✅ Toplu uyarı çözme
- ✅ Otomatik uyarı oluşturma

#### SuggestionEngine
- ✅ Öneri oluşturma
- ✅ Öneri skorlama
- ✅ Öneri uygulama
- ✅ Öğretmen yükü hesaplama
- ✅ Program çakışması kontrolü
- ✅ Önbellek yönetimi

### Frontend Integration Testleri

#### ElectiveAlertManager
- ✅ Uyarı yükleme ve görüntüleme
- ✅ Uyarı listesi render etme
- ✅ Uyarı çözme işlemleri
- ✅ Uyarı sayısı güncelleme
- ✅ Otomatik yenileme
- ✅ Zaman formatlaması

#### ElectiveTracker
- ✅ Durum listesi yükleme
- ✅ İstatistik görüntüleme
- ✅ Filtreleme işlemleri
- ✅ Tablo sıralama
- ✅ Durum satırı oluşturma
- ✅ Öneri oluşturma
- ✅ Hızlı atama paneli
- ✅ Veri yenileme

#### QuickAssignmentPanel
- ✅ Sınıf bilgisi yükleme
- ✅ Mevcut seçmeli dersler
- ✅ Öğretmen seçimi
- ✅ Atama önizlemesi
- ✅ Atama onaylama

## Test Konfigürasyonu

### Jest Ayarları
- **Test Environment**: Node.js (backend), JSDOM (frontend)
- **Coverage**: Text, LCOV, HTML formatları
- **Timeout**: 10 saniye
- **Mock**: Otomatik mock temizleme

### Mock Yapısı
- **Electron API**: Tam mock implementasyonu
- **Database**: SQLite mock'ları
- **DOM**: JSDOM ile simülasyon
- **Chart.js**: Mock chart implementasyonu

## Test Yazma Kuralları

### Backend Testleri
1. Her metod için pozitif ve negatif senaryolar
2. Database error handling
3. Edge case'ler (null, undefined, empty arrays)
4. Async/await pattern kullanımı

### Frontend Testleri
1. DOM manipülasyonu testleri
2. Event handling testleri
3. API çağrısı mock'ları
4. User interaction simülasyonları

## Coverage Hedefleri

- **Backend**: %90+ kod kapsamı
- **Frontend**: %85+ kod kapsamı
- **Critical paths**: %100 kapsam

## Sürekli Entegrasyon

Testler her commit'te otomatik olarak çalışır ve aşağıdaki kriterleri karşılamalıdır:
- Tüm testler geçmeli
- Coverage hedefleri karşılanmalı
- Lint kurallarına uygun olmalı

## Troubleshooting

### Yaygın Sorunlar

1. **Mock import hataları**: Mock'ların test dosyasının başında tanımlandığından emin olun
2. **DOM element bulunamıyor**: beforeEach'te DOM setup'ının yapıldığından emin olun
3. **Async test timeout**: Test timeout süresini artırın veya mock'ları kontrol edin
4. **Coverage eksik**: Test edilmeyen kod yollarını kontrol edin

### Debug İpuçları

```bash
# Verbose output ile test çalıştır
npm test -- --verbose

# Belirli bir test dosyasını çalıştır
npm test -- ElectiveTrackerManager.test.js

# Debug modunda çalıştır
npm test -- --detectOpenHandles
```