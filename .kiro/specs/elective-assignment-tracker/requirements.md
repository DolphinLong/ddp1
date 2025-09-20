# Seçmeli Ders Atama Takip Sistemi - Gereksinimler

## Giriş

Modern Ders Yönetim Sistemi'nde seçmeli ders atama sürecini kolaylaştırmak ve eksik atamaları görünür kılmak için bir takip sistemi geliştirilecektir. Bu sistem, özellikle ortaokul seviyesinde her sınıf için 3 seçmeli ders atanması gerekliliğini dikkate alarak, hangi derslerin atanmadığını belirten uyarı mesajları ve detaylı takip tabloları sunacaktır.

## Gereksinimler

### Gereksinim 1: Seçmeli Ders Atama Durumu Görüntüleme

**Kullanıcı Hikayesi:** Okul yöneticisi olarak, hangi sınıflara hangi seçmeli derslerin atandığını ve hangilerinin eksik olduğunu kolayca görebilmek istiyorum, böylece ders atama sürecini daha verimli yönetebilirim.

#### Kabul Kriterleri

1. WHEN kullanıcı sınıf yönetimi sayfasını açtığında THEN sistem her sınıf için seçmeli ders atama durumunu gösterecek
2. WHEN bir sınıfın seçmeli ders sayısı 3'ten az olduğunda THEN sistem kırmızı uyarı gösterecek
3. WHEN bir sınıfın seçmeli ders sayısı tam 3 olduğunda THEN sistem yeşil onay işareti gösterecek
4. WHEN kullanıcı bir sınıfın seçmeli ders durumuna tıkladığında THEN detaylı atama bilgileri modal pencerede açılacak

### Gereksinim 2: Eksik Seçmeli Ders Uyarı Sistemi

**Kullanıcı Hikayesi:** Sistem yöneticisi olarak, seçmeli ders ataması eksik olan sınıflar için otomatik uyarılar almak istiyorum, böylece hiçbir sınıf eksik kalmayacak.

#### Kabul Kriterleri

1. WHEN sistem başlatıldığında THEN eksik seçmeli ders ataması olan sınıflar için dashboard'da uyarı gösterecek
2. WHEN kullanıcı öğretmen atama sayfasını açtığında THEN eksik atamalar için bildirim paneli görünecek
3. WHEN eksik atama sayısı 5'ten fazla olduğunda THEN sistem kritik uyarı seviyesinde bildirim gösterecek
4. IF bir sınıfın seçmeli ders ataması tamamlandığında THEN sistem başarı mesajı gösterecek

### Gereksinim 3: Seçmeli Ders Atama Takip Tablosu

**Kullanıcı Hikayesi:** Eğitim koordinatörü olarak, tüm sınıfların seçmeli ders atama durumunu tek bir tabloda görebilmek istiyorum, böylece genel durumu hızlıca değerlendirebilirim.

#### Kabul Kriterleri

1. WHEN kullanıcı "Seçmeli Ders Takibi" sekmesini açtığında THEN tüm sınıfların atama durumunu gösteren tablo görünecek
2. WHEN tablo yüklendiğinde THEN her sınıf için atanan seçmeli ders sayısı, eksik ders sayısı ve durum gösterilecek
3. WHEN kullanıcı tabloda bir satıra tıkladığında THEN o sınıf için hızlı atama paneli açılacak
4. WHEN tablo filtrelendiğinde THEN sadece eksik ataması olan sınıflar gösterilebilecek

### Gereksinim 4: Hızlı Seçmeli Ders Atama Arayüzü

**Kullanıcı Hikayesi:** Öğretmen olarak, seçmeli ders atamalarını hızlı bir şekilde yapabilmek istiyorum, böylece zaman kaybetmeden tüm sınıfları tamamlayabilirim.

#### Kabul Kriterleri

1. WHEN kullanıcı hızlı atama panelini açtığında THEN mevcut seçmeli dersler ve uygun öğretmenler listelenecek
2. WHEN kullanıcı bir seçmeli ders seçtiğinde THEN o dersi verebilecek öğretmenler otomatik filtrelenecek
3. WHEN atama tamamlandığında THEN sistem otomatik olarak çakışma kontrolü yapacak
4. IF çakışma tespit edilirse THEN sistem alternatif öneriler sunacak

### Gereksinim 5: Seçmeli Ders İstatistikleri ve Raporlama

**Kullanıcı Hikayesi:** Okul müdürü olarak, seçmeli ders atama sürecinin genel durumunu ve istatistiklerini görebilmek istiyorum, böylece karar verme süreçlerimi destekleyebilirim.

#### Kabul Kriterleri

1. WHEN kullanıcı raporlar sayfasını açtığında THEN seçmeli ders atama istatistikleri görünecek
2. WHEN rapor oluşturulduğunda THEN tamamlanma yüzdesi, eksik atama sayısı ve ders dağılımı gösterilecek
3. WHEN kullanıcı detaylı rapor istediğinde THEN sınıf bazında breakdown sunulacak
4. WHEN rapor export edildiğinde THEN Excel formatında detaylı liste oluşturulacak

### Gereksinim 6: Otomatik Seçmeli Ders Önerisi

**Kullanıcı Hikayesi:** Sistem kullanıcısı olarak, eksik seçmeli ders atamaları için sistem tarafından otomatik öneriler almak istiyorum, böylece manuel araştırma yapmadan hızlı kararlar verebilirim.

#### Kabul Kriterleri

1. WHEN bir sınıf için seçmeli ders ataması eksik olduğunda THEN sistem uygun ders önerileri sunacak
2. WHEN öneriler sunulduğunda THEN öğretmen müsaitliği ve ders yükü dikkate alınacak
3. WHEN kullanıcı bir öneriyi kabul ettiğinde THEN otomatik atama gerçekleşecek
4. IF öneri kabul edilemezse THEN sistem alternatif seçenekler sunacak