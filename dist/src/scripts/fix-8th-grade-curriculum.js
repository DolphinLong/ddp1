"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurriculumFixer = void 0;
exports.runCurriculumFix = runCurriculumFix;
const DatabaseManager_1 = require("../database/DatabaseManager");
class CurriculumFixer {
    constructor(dbManager) {
        this.dbManager = dbManager;
    }
    async fix8thGradeIssues() {
        console.log('=== 8. Sınıf Müfredat Düzeltmesi Başlıyor ===');
        try {
            // 1. Mevcut 8. sınıf Sosyal Bilgiler dersini kontrol et
            const socialStudiesLesson = await this.dbManager.getOne(`
        SELECT * FROM lessons 
        WHERE name = 'Sosyal Bilgiler' AND grade = 8 AND school_type = 'Ortaokul'
      `);
            if (socialStudiesLesson) {
                console.log('8. sınıf Sosyal Bilgiler dersi bulundu:', socialStudiesLesson);
                // Bu dersin öğretmen atamalarını kontrol et
                const assignments = await this.dbManager.getAll(`
          SELECT ta.*, t.name as teacher_name, c.grade, c.section
          FROM teacher_assignments ta
          JOIN teachers t ON ta.teacher_id = t.id
          JOIN classes c ON ta.class_id = c.id
          WHERE ta.lesson_id = ? AND c.grade = 8
        `, [socialStudiesLesson.id]);
                if (assignments.length > 0) {
                    console.log(`8. sınıf Sosyal Bilgiler dersinin ${assignments.length} ataması siliniyor...`);
                    await this.dbManager.runSQL(`
            DELETE FROM teacher_assignments 
            WHERE lesson_id = ? AND class_id IN (
              SELECT id FROM classes WHERE grade = 8 AND school_type = 'Ortaokul'
            )
          `, [socialStudiesLesson.id]);
                }
                // 8. sınıf Sosyal Bilgiler dersini sil
                await this.dbManager.runSQL(`
          DELETE FROM lessons 
          WHERE name = 'Sosyal Bilgiler' AND grade = 8 AND school_type = 'Ortaokul'
        `);
                console.log('8. sınıf Sosyal Bilgiler dersi veritabanından kaldırıldı.');
            }
            // 2. T.C. İnkılap Tarihi ve Atatürkçülük dersinin olup olmadığını kontrol et
            const historyLesson = await this.dbManager.getOne(`
        SELECT * FROM lessons 
        WHERE name = 'T.C. İnkılap Tarihi ve Atatürkçülük' AND grade = 8 AND school_type = 'Ortaokul'
      `);
            if (!historyLesson) {
                console.log('8. sınıf T.C. İnkılap Tarihi ve Atatürkçülük dersi ekleniyor...');
                await this.dbManager.runSQL(`
          INSERT INTO lessons (name, grade, weekly_hours, is_mandatory, school_type, created_at, updated_at)
          VALUES ('T.C. İnkılap Tarihi ve Atatürkçülük', 8, 2, 1, 'Ortaokul', datetime('now'), datetime('now'))
        `);
                console.log('8. sınıf T.C. İnkılap Tarihi ve Atatürkçülük dersi eklendi.');
            }
            // 3. Diğer 8. sınıf derslerini kontrol et ve MEB müfredatına uygun hale getir
            const correctLessons = [
                { name: 'Türkçe', hours: 5 },
                { name: 'Matematik', hours: 5 },
                { name: 'Fen Bilimleri', hours: 4 },
                { name: 'T.C. İnkılap Tarihi ve Atatürkçülük', hours: 2 },
                { name: 'Din Kültürü ve Ahlak Bilgisi', hours: 2 },
                { name: 'İngilizce', hours: 4 },
                { name: 'Beden Eğitimi ve Spor', hours: 2 },
                { name: 'Görsel Sanatlar', hours: 1 },
                { name: 'Müzik', hours: 1 },
                { name: 'Teknoloji ve Tasarım', hours: 2 },
                { name: 'Rehberlik ve Yönlendirme', hours: 1 }
            ];
            // Her doğru dersi kontrol et ve gerekirse ekle/güncelle
            for (const lesson of correctLessons) {
                const existingLesson = await this.dbManager.getOne(`
          SELECT * FROM lessons 
          WHERE name = ? AND grade = 8 AND school_type = 'Ortaokul'
        `, [lesson.name]);
                if (!existingLesson) {
                    console.log(`8. sınıf ${lesson.name} dersi ekleniyor...`);
                    await this.dbManager.runSQL(`
            INSERT INTO lessons (name, grade, weekly_hours, is_mandatory, school_type, created_at, updated_at)
            VALUES (?, 8, ?, 1, 'Ortaokul', datetime('now'), datetime('now'))
          `, [lesson.name, lesson.hours]);
                }
                else if (existingLesson.weekly_hours !== lesson.hours) {
                    console.log(`8. sınıf ${lesson.name} dersi saati güncelleniyor: ${existingLesson.weekly_hours} -> ${lesson.hours}`);
                    await this.dbManager.runSQL(`
            UPDATE lessons 
            SET weekly_hours = ?, updated_at = datetime('now')
            WHERE id = ?
          `, [lesson.hours, existingLesson.id]);
                }
            }
            // 4. Son durumu göster
            console.log('\n=== 8. Sınıf Dersleri (Güncel) ===');
            const grade8Lessons = await this.dbManager.getAll(`
        SELECT name, weekly_hours, is_mandatory 
        FROM lessons 
        WHERE grade = 8 AND school_type = 'Ortaokul'
        ORDER BY is_mandatory DESC, name ASC
      `);
            let totalHours = 0;
            grade8Lessons.forEach(lesson => {
                console.log(`- ${lesson.name}: ${lesson.weekly_hours} saat/hafta (${lesson.is_mandatory ? 'Zorunlu' : 'Seçmeli'})`);
                if (lesson.is_mandatory) {
                    totalHours += lesson.weekly_hours;
                }
            });
            console.log(`\nToplam zorunlu ders saati: ${totalHours} saat/hafta`);
            console.log('8. sınıf müfredat düzeltmesi tamamlandı!');
        }
        catch (error) {
            console.error('8. sınıf müfredat düzeltmesi sırasında hata:', error);
            throw error;
        }
    }
    async fixMathHoursForGrades5to7() {
        console.log('\n=== 5-7. Sınıflar Matematik Ders Saati Düzeltmesi ===');
        try {
            const grades = [5, 6, 7];
            for (const grade of grades) {
                console.log(`${grade}. sınıf matematik dersi kontrol ediliyor...`);
                const mathLesson = await this.dbManager.getOne(`
          SELECT * FROM lessons 
          WHERE name = 'Matematik' AND grade = ? AND school_type = 'Ortaokul'
        `, [grade]);
                if (mathLesson) {
                    if (mathLesson.weekly_hours !== 5) {
                        console.log(`${grade}. sınıf Matematik dersi saati güncelleniyor: ${mathLesson.weekly_hours} -> 5`);
                        await this.dbManager.runSQL(`
              UPDATE lessons 
              SET weekly_hours = 5, updated_at = datetime('now')
              WHERE id = ?
            `, [mathLesson.id]);
                    }
                    else {
                        console.log(`${grade}. sınıf Matematik dersi zaten 5 saat/hafta.`);
                    }
                }
                else {
                    console.log(`${grade}. sınıf Matematik dersi bulunamadı, ekleniyor...`);
                    await this.dbManager.runSQL(`
            INSERT INTO lessons (name, grade, weekly_hours, is_mandatory, school_type, created_at, updated_at)
            VALUES ('Matematik', ?, 5, 1, 'Ortaokul', datetime('now'), datetime('now'))
          `, [grade]);
                }
            }
            console.log('\n5-7. sınıflar matematik ders saati düzeltmesi tamamlandı!');
        }
        catch (error) {
            console.error('5-7. sınıflar matematik düzeltmesi sırasında hata:', error);
            throw error;
        }
    }
    async fixForeignLanguageHours() {
        console.log('\n=== Yabancı Dil Ders Saatleri Düzeltmesi ===');
        try {
            // Yabancı dil dersi isimleri (İngilizce ve Yabancı Dil olabilir)
            const foreignLanguageNames = ['İngilizce', 'Yabancı Dil (İngilizce)', 'Yabancı Dil'];
            // 5. ve 6. sınıflar: 3 saat
            // 7. ve 8. sınıflar: 4 saat
            const gradeHours = {
                5: 3,
                6: 3,
                7: 4,
                8: 4
            };
            for (const grade of [5, 6, 7, 8]) {
                const expectedHours = gradeHours[grade];
                console.log(`${grade}. sınıf yabancı dil dersleri kontrol ediliyor (hedef: ${expectedHours} saat)...`);
                // Bu sınıf için mevcut yabancı dil derslerini bul
                for (const languageName of foreignLanguageNames) {
                    const languageLesson = await this.dbManager.getOne(`
            SELECT * FROM lessons 
            WHERE name = ? AND grade = ? AND school_type = 'Ortaokul'
          `, [languageName, grade]);
                    if (languageLesson) {
                        if (languageLesson.weekly_hours !== expectedHours) {
                            console.log(`${grade}. sınıf ${languageName} dersi saati güncelleniyor: ${languageLesson.weekly_hours} -> ${expectedHours}`);
                            await this.dbManager.runSQL(`
                UPDATE lessons 
                SET weekly_hours = ?, updated_at = datetime('now')
                WHERE id = ?
              `, [expectedHours, languageLesson.id]);
                        }
                        else {
                            console.log(`${grade}. sınıf ${languageName} dersi zaten ${expectedHours} saat/hafta.`);
                        }
                    }
                }
                // Eğer hiç yabancı dil dersi yoksa İngilizce ekle
                const hasAnyLanguage = await this.dbManager.getOne(`
          SELECT * FROM lessons 
          WHERE name IN (${foreignLanguageNames.map(() => '?').join(',')}) 
          AND grade = ? AND school_type = 'Ortaokul'
        `, [...foreignLanguageNames, grade]);
                if (!hasAnyLanguage) {
                    console.log(`${grade}. sınıf İngilizce dersi bulunamadı, ekleniyor (${expectedHours} saat)...`);
                    await this.dbManager.runSQL(`
            INSERT INTO lessons (name, grade, weekly_hours, is_mandatory, school_type, created_at, updated_at)
            VALUES ('İngilizce', ?, ?, 1, 'Ortaokul', datetime('now'), datetime('now'))
          `, [grade, expectedHours]);
                }
            }
            console.log('\nYabancı dil ders saatleri düzeltmesi tamamlandı!');
        }
        catch (error) {
            console.error('Yabancı dil dersi düzeltmesi sırasında hata:', error);
            throw error;
        }
    }
    async fixTurkishHoursForMiddleSchool() {
        console.log('\n=== Ortaokul Türkçe Ders Saatleri Düzeltmesi (5-8. Sınıflar) ===');
        try {
            const gradeHours = {
                5: 6,
                6: 6,
                7: 5,
                8: 5,
            };
            for (const grade of [5, 6, 7, 8]) {
                const expectedHours = gradeHours[grade];
                console.log(`${grade}. sınıf Türkçe dersi kontrol ediliyor (hedef: ${expectedHours} saat)...`);
                const turkishLesson = await this.dbManager.getOne(`SELECT * FROM lessons WHERE name = 'Türkçe' AND grade = ? AND school_type = 'Ortaokul'`, [grade]);
                if (turkishLesson) {
                    if (turkishLesson.weekly_hours !== expectedHours) {
                        console.log(`${grade}. sınıf Türkçe dersi saati güncelleniyor: ${turkishLesson.weekly_hours} -> ${expectedHours}`);
                        await this.dbManager.runSQL(`UPDATE lessons SET weekly_hours = ?, updated_at = datetime('now') WHERE id = ?`, [expectedHours, turkishLesson.id]);
                    }
                    else {
                        console.log(`${grade}. sınıf Türkçe dersi zaten ${expectedHours} saat/hafta.`);
                    }
                }
                else {
                    console.log(`${grade}. sınıf Türkçe dersi bulunamadı, ekleniyor (${expectedHours} saat)...`);
                    await this.dbManager.runSQL(`INSERT INTO lessons (name, grade, weekly_hours, is_mandatory, school_type, created_at, updated_at)
             VALUES ('Türkçe', ?, ?, 1, 'Ortaokul', datetime('now'), datetime('now'))`, [grade, expectedHours]);
                }
            }
            console.log('Ortaokul Türkçe ders saatleri düzeltmesi tamamlandı!');
        }
        catch (error) {
            console.error('Türkçe ders saatleri düzeltmesi sırasında hata:', error);
            throw error;
        }
    }
    async addElectiveLessons() {
        console.log('\n=== Seçmeli Dersler Ekleniyor ===');
        try {
            // Ortaokul seçmeli dersleri - MEB 2023-2024 müfredatı baz alınarak
            const electiveLessons = [
                // 5. Sınıf Seçmeli Dersleri (2 saat)
                { name: 'Bilim Uygulamaları', grades: [5, 6], hours: 2, school_type: 'Ortaokul' },
                { name: 'Proje Tasarım ve Yönetimi', grades: [5, 6], hours: 2, school_type: 'Ortaokul' },
                { name: 'İnsan Hakları, Yurttaşlık ve Demokrasi', grades: [5, 6], hours: 2, school_type: 'Ortaokul' },
                { name: 'Oyun ve Fiziki Etkinlikler', grades: [5, 6], hours: 2, school_type: 'Ortaokul' },
                { name: 'Kur\'an-ı Kerim', grades: [5, 6], hours: 2, school_type: 'Ortaokul' },
                { name: 'Peygamberimizin Hayatı', grades: [5, 6], hours: 2, school_type: 'Ortaokul' },
                { name: 'Temel Dini Bilgiler', grades: [5, 6], hours: 2, school_type: 'Ortaokul' },
                // 7. Sınıf Seçmeli Dersleri (2 saat)
                { name: 'Matematik Uygulamaları', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Fen Uygulamaları', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Robotik ve Kodlama', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Araştırma Projeleri', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Spor ve Fiziki Etkinlikler', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Oyun ve Fiziki Etkinlikler', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Kur\'an-ı Kerim', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Peygamberimizin Hayatı', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Temel Dini Bilgiler', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Hz. Muhammed\'in Hayatı', grades: [7, 8], hours: 2, school_type: 'Ortaokul' },
                // Tüm Sınıflar için Ortak Seçmeli Dersler
                { name: 'Yaratici Drama', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Zeka Oyunları', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Yarışmacı Matematik', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Bilişim Teknolojileri', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'İkinci Yabancı Dil (Almanca)', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'İkinci Yabancı Dil (Fransızca)', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Okuma Becerileri', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Yazarlık ve Yazma Becerileri', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Halk Kültürü', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'İş Güvenliği ve Sağlığı', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Türkiye Coğrafyası', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Aile Eğitimi', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Çevre Eğitimi', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Medya Okur Yazarlığı', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
                { name: 'Girişimcilik', grades: [5, 6, 7, 8], hours: 2, school_type: 'Ortaokul' },
            ];
            let addedCount = 0;
            for (const lesson of electiveLessons) {
                for (const grade of lesson.grades) {
                    // Bu ders bu sınıfta var mı kontrol et
                    const existingLesson = await this.dbManager.getOne(`
            SELECT * FROM lessons 
            WHERE name = ? AND grade = ? AND school_type = ?
          `, [lesson.name, grade, lesson.school_type]);
                    if (!existingLesson) {
                        console.log(`${grade}. sınıf seçmeli dersi ekleniyor: ${lesson.name} (${lesson.hours} saat)`);
                        await this.dbManager.runSQL(`
              INSERT INTO lessons (name, grade, weekly_hours, is_mandatory, school_type, created_at, updated_at)
              VALUES (?, ?, ?, 0, ?, datetime('now'), datetime('now'))
            `, [lesson.name, grade, lesson.hours, lesson.school_type]);
                        addedCount++;
                    }
                }
            }
            console.log(`\n${addedCount} adet seçmeli ders eklendi!`);
            console.log('Seçmeli dersler ekleme işlemi tamamlandı!');
        }
        catch (error) {
            console.error('Seçmeli dersler eklenirken hata:', error);
            throw error;
        }
    }
}
exports.CurriculumFixer = CurriculumFixer;
async function runCurriculumFix(dbManager) {
    const fixer = new CurriculumFixer(dbManager);
    // Fix 8th grade curriculum issues (remove Social Studies, add History)
    await fixer.fix8thGradeIssues();
    // Fix math hours for grades 5-7 to be 5 hours per week
    await fixer.fixMathHoursForGrades5to7();
    // Fix foreign language hours: grades 5-6 = 3 hours, grades 7-8 = 4 hours
    await fixer.fixForeignLanguageHours();
    // Fix Turkish hours across middle school: 5-6 = 6 hours, 7-8 = 5 hours
    await fixer.fixTurkishHoursForMiddleSchool();
    // Add elective lessons for middle school
    await fixer.addElectiveLessons();
    console.log('\n=== Tüm Müfredat Düzeltmeleri Tamamlandı ===');
}
// Main execution block
if (require.main === module) {
    (async () => {
        const dbManager = new DatabaseManager_1.DatabaseManager();
        await dbManager.initialize();
        await runCurriculumFix(dbManager);
        await dbManager.close();
    })().catch(console.error);
}
//# sourceMappingURL=fix-8th-grade-curriculum.js.map