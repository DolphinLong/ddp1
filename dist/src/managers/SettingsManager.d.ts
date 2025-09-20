import { DatabaseManager } from '../database/DatabaseManager';
export declare class SettingsManager {
    private dbManager;
    constructor(dbManager: DatabaseManager);
    getSetting(key: string): Promise<string | null>;
    setSetting(key: string, value: string): Promise<boolean>;
    getAllSettings(): Promise<any[]>;
    getSchoolSettings(): Promise<any>;
    getDailyPeriodsForSchoolType(schoolType: string): number;
    updateSchoolSettings(settings: any): Promise<boolean>;
    initializeWithSchoolType(): Promise<void>;
}
//# sourceMappingURL=SettingsManager.d.ts.map