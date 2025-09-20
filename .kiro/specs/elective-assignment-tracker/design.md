# Seçmeli Ders Atama Takip Sistemi - Tasarım Belgesi

## Genel Bakış

Bu tasarım belgesi, Modern Ders Yönetim Sistemi'ne entegre edilecek Seçmeli Ders Atama Takip Sistemi'nin teknik mimarisini, bileşenlerini ve arayüz tasarımını detaylandırmaktadır. Sistem, özellikle ortaokul seviyesinde seçmeli ders atama sürecini kolaylaştırmak ve eksik atamaları görünür kılmak için tasarlanmıştır.

## Mimari Tasarım

### Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Renderer)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Dashboard     │  │  Class Mgmt     │  │ Elective Track  │ │
│  │   Warnings      │  │   Status        │  │     Table       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Quick Assignment│  │   Statistics    │  │   Suggestions   │ │
│  │     Panel       │  │    Reports      │  │     Engine      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    IPC Communication                        │
├─────────────────────────────────────────────────────────────┤
│                   Backend (Main Process)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ ElectiveTracker │  │ AssignmentAlert │  │ SuggestionEngine│ │
│  │    Manager      │  │    Manager      │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Database Layer                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ elective_status │  │assignment_alerts│  │ suggestion_cache│ │
│  │     table       │  │     table       │  │     table       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Veri Modeli

#### Yeni Tablolar

```sql
-- Seçmeli ders atama durumu takibi
CREATE TABLE elective_assignment_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    grade INTEGER NOT NULL,
    required_electives INTEGER DEFAULT 3,
    assigned_electives INTEGER DEFAULT 0,
    missing_electives INTEGER DEFAULT 3,
    status TEXT DEFAULT 'incomplete', -- 'complete', 'incomplete', 'over_assigned'
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- Uyarı sistemi için bildirimler
CREATE TABLE assignment_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    alert_type TEXT NOT NULL, -- 'missing_electives', 'over_assignment', 'conflict'
    severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'critical'
    message TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- Öneri sistemi cache
CREATE TABLE elective_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    suggestion_score REAL DEFAULT 0.0,
    reasoning TEXT,
    is_applied BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY(lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    FOREIGN KEY(teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);
```

## Bileşen Tasarımı

### 1. ElectiveTrackerManager (Backend)

```typescript
export class ElectiveTrackerManager {
    constructor(private dbManager: DatabaseManager) {}
    
    // Ana takip fonksiyonları
    async updateElectiveStatus(classId: number): Promise<ElectiveStatus>
    async getElectiveStatusForClass(classId: number): Promise<ElectiveStatus>
    async getAllElectiveStatuses(): Promise<ElectiveStatus[]>
    async getIncompleteAssignments(): Promise<IncompleteAssignment[]>
    
    // Uyarı sistemi
    async generateAlerts(): Promise<AssignmentAlert[]>
    async resolveAlert(alertId: number): Promise<boolean>
    async getActiveAlerts(): Promise<AssignmentAlert[]>
    
    // İstatistik fonksiyonları
    async getElectiveStatistics(): Promise<ElectiveStatistics>
    async getCompletionPercentage(): Promise<number>
    async getElectiveDistribution(): Promise<ElectiveDistribution[]>
}
```

### 2. AssignmentAlertManager (Backend)

```typescript
export class AssignmentAlertManager {
    constructor(private dbManager: DatabaseManager) {}
    
    async createAlert(classId: number, type: AlertType, message: string): Promise<number>
    async updateAlertSeverity(alertId: number, severity: AlertSeverity): Promise<boolean>
    async resolveAlert(alertId: number): Promise<boolean>
    async getAlertsByClass(classId: number): Promise<AssignmentAlert[]>
    async getCriticalAlerts(): Promise<AssignmentAlert[]>
    async cleanupResolvedAlerts(): Promise<number>
}
```

### 3. SuggestionEngine (Backend)

```typescript
export class SuggestionEngine {
    constructor(private dbManager: DatabaseManager) {}
    
    async generateSuggestions(classId: number): Promise<ElectiveSuggestion[]>
    async scoreSuggestion(classId: number, lessonId: number, teacherId: number): Promise<number>
    async applySuggestion(suggestionId: number): Promise<boolean>
    async refreshSuggestionCache(): Promise<void>
    
    private calculateTeacherWorkload(teacherId: number): Promise<number>
    private checkScheduleConflicts(classId: number, teacherId: number): Promise<boolean>
    private getElectivePreferences(grade: number): Promise<LessonPreference[]>
}
```

## Arayüz Tasarımı

### 1. Dashboard Uyarı Paneli

```html
<div class="elective-alerts-panel">
    <div class="alert-header">
        <h3>Seçmeli Ders Uyarıları</h3>
        <span class="alert-count" id="alert-count">0</span>
    </div>
    <div class="alert-list" id="elective-alerts">
        <!-- Dinamik uyarı listesi -->
    </div>
    <div class="alert-actions">
        <button class="btn btn-primary" onclick="openElectiveTracker()">
            Detaylı Görünüm
        </button>
    </div>
</div>
```

### 2. Seçmeli Ders Takip Tablosu

```html
<div class="elective-tracker-table">
    <div class="table-header">
        <h2>Seçmeli Ders Atama Durumu</h2>
        <div class="table-controls">
            <select id="grade-filter">
                <option value="">Tüm Seviyeler</option>
                <option value="5">5. Sınıf</option>
                <option value="6">6. Sınıf</option>
                <option value="7">7. Sınıf</option>
                <option value="8">8. Sınıf</option>
            </select>
            <select id="status-filter">
                <option value="">Tüm Durumlar</option>
                <option value="incomplete">Eksik</option>
                <option value="complete">Tamamlanmış</option>
            </select>
        </div>
    </div>
    
    <table class="elective-status-table">
        <thead>
            <tr>
                <th>Sınıf</th>
                <th>Atanan Seçmeli</th>
                <th>Eksik Seçmeli</th>
                <th>Durum</th>
                <th>Son Güncelleme</th>
                <th>İşlemler</th>
            </tr>
        </thead>
        <tbody id="elective-status-tbody">
            <!-- Dinamik içerik -->
        </tbody>
    </table>
</div>
```

### 3. Hızlı Atama Paneli

```html
<div class="quick-assignment-modal" id="quick-assignment-modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3>Hızlı Seçmeli Ders Ataması</h3>
            <span class="class-info" id="selected-class-info"></span>
        </div>
        
        <div class="assignment-form">
            <div class="available-electives">
                <h4>Mevcut Seçmeli Dersler</h4>
                <div class="elective-grid" id="available-electives-grid">
                    <!-- Dinamik seçmeli ders listesi -->
                </div>
            </div>
            
            <div class="teacher-selection">
                <h4>Uygun Öğretmenler</h4>
                <select id="teacher-select">
                    <option value="">Öğretmen Seçin</option>
                </select>
            </div>
            
            <div class="assignment-preview">
                <h4>Atama Önizlemesi</h4>
                <div class="preview-content" id="assignment-preview">
                    <!-- Önizleme içeriği -->
                </div>
            </div>
        </div>
        
        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="closeQuickAssignment()">
                İptal
            </button>
            <button class="btn btn-primary" onclick="confirmAssignment()">
                Ataması Yap
            </button>
        </div>
    </div>
</div>
```

### 4. İstatistik Dashboard'u

```html
<div class="elective-statistics-panel">
    <div class="stats-grid">
        <div class="stat-card completion">
            <div class="stat-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="stat-content">
                <span class="stat-value" id="completion-percentage">0%</span>
                <span class="stat-label">Tamamlanma Oranı</span>
            </div>
        </div>
        
        <div class="stat-card missing">
            <div class="stat-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="stat-content">
                <span class="stat-value" id="missing-assignments">0</span>
                <span class="stat-label">Eksik Atama</span>
            </div>
        </div>
        
        <div class="stat-card total-classes">
            <div class="stat-icon">
                <i class="fas fa-school"></i>
            </div>
            <div class="stat-content">
                <span class="stat-value" id="total-classes">0</span>
                <span class="stat-label">Toplam Sınıf</span>
            </div>
        </div>
    </div>
    
    <div class="distribution-chart">
        <h4>Seçmeli Ders Dağılımı</h4>
        <canvas id="elective-distribution-chart"></canvas>
    </div>
</div>
```

## Veri Akışı

### 1. Seçmeli Ders Durumu Güncelleme

```
1. Öğretmen ataması yapıldığında
2. ElectiveTrackerManager.updateElectiveStatus() çağrılır
3. Sınıfın mevcut seçmeli ders sayısı hesaplanır
4. elective_assignment_status tablosu güncellenir
5. Gerekirse uyarı oluşturulur/kaldırılır
6. Frontend'e güncel durum gönderilir
```

### 2. Uyarı Sistemi Akışı

```
1. Sistem periyodik olarak kontrol yapar
2. AssignmentAlertManager eksik atamaları tespit eder
3. Yeni uyarılar oluşturulur
4. Çözülen uyarılar işaretlenir
5. Dashboard'da uyarı sayısı güncellenir
```

### 3. Öneri Sistemi Akışı

```
1. Kullanıcı öneri talep eder
2. SuggestionEngine mevcut durumu analiz eder
3. Uygun ders-öğretmen kombinasyonları bulunur
4. Her kombinasyon için skor hesaplanır
5. En iyi öneriler kullanıcıya sunulur
```

## Hata Yönetimi

### Hata Türleri ve Çözümleri

1. **Çakışma Hataları**
   - Öğretmen müsaitlik kontrolü
   - Sınıf program çakışması kontrolü
   - Alternatif öneriler sunma

2. **Veri Tutarsızlığı**
   - Otomatik veri senkronizasyonu
   - Tutarsızlık tespiti ve düzeltme
   - Kullanıcı bilgilendirmesi

3. **Performans Sorunları**
   - Öneri cache sistemi
   - Lazy loading
   - Batch işlemler

## Test Stratejisi

### Unit Testler
- ElectiveTrackerManager fonksiyonları
- SuggestionEngine algoritmaları
- Veri doğrulama fonksiyonları

### Integration Testler
- Database işlemleri
- IPC iletişimi
- Frontend-backend entegrasyonu

### End-to-End Testler
- Tam atama süreci
- Uyarı sistemi akışı
- Rapor oluşturma

## Performans Optimizasyonları

1. **Database İndeksleri**
   ```sql
   CREATE INDEX idx_elective_status_class ON elective_assignment_status(class_id);
   CREATE INDEX idx_alerts_class_severity ON assignment_alerts(class_id, severity);
   CREATE INDEX idx_suggestions_class ON elective_suggestions(class_id, suggestion_score);
   ```

2. **Cache Stratejisi**
   - Öneri sonuçları cache'leme
   - İstatistik verilerini cache'leme
   - Lazy loading ile performans artırımı

3. **Batch İşlemler**
   - Toplu durum güncellemeleri
   - Batch uyarı oluşturma
   - Performanslı rapor oluşturma

Bu tasarım, seçmeli ders atama sürecini önemli ölçüde kolaylaştıracak ve eksik atamaları görünür kılarak eğitim yöneticilerinin işini kolaylaştıracaktır.