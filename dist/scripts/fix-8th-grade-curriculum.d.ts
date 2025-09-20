import { DatabaseManager } from '../database/DatabaseManager';
export declare class CurriculumFixer {
    private dbManager;
    constructor(dbManager: DatabaseManager);
    fix8thGradeIssues(): Promise<void>;
    fixMathHoursForGrades5to7(): Promise<void>;
    fixForeignLanguageHours(): Promise<void>;
    fixTurkishHoursForMiddleSchool(): Promise<void>;
    addElectiveLessons(): Promise<void>;
}
export declare function runCurriculumFix(dbManager: DatabaseManager): Promise<void>;
//# sourceMappingURL=fix-8th-grade-curriculum.d.ts.map