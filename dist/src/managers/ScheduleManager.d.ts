import { DatabaseManager, ScheduleItem } from '../database/DatabaseManager';
export interface ScheduleConflict {
    type: 'teacher_double_booking' | 'classroom_conflict' | 'class_overload' | 'teacher_unavailable';
    message: string;
    schedule_items: number[];
    severity: 'high' | 'medium' | 'low';
}
export interface ScheduleGenerationConfig {
    start_time: string;
    end_time: string;
    break_duration: number;
    lunch_break_start: string;
    lunch_break_duration: number;
    avoid_first_last_period: string[];
    max_consecutive_lessons: number;
    preferred_days: number[];
}
export declare class ScheduleManager {
    private dbManager;
    private teacherManager;
    private classManager;
    private lessonManager;
    constructor(dbManager: DatabaseManager);
    getClassSchedule(classId: number): Promise<ScheduleItem[]>;
    getTeacherSchedule(teacherId: number): Promise<ScheduleItem[]>;
    createScheduleItem(scheduleItem: Omit<ScheduleItem, 'id' | 'created_at' | 'updated_at'>): Promise<ScheduleItem>;
    updateScheduleItem(id: number, scheduleItem: Partial<ScheduleItem>): Promise<ScheduleItem>;
    deleteScheduleItem(id: number): Promise<boolean>;
    detectConflicts(): Promise<ScheduleConflict[]>;
    private detectScheduleItemConflicts;
    generateSchedule(config?: Partial<ScheduleGenerationConfig>): Promise<{
        success: boolean;
        message: string;
        conflicts: ScheduleConflict[];
    }>;
    saveSchedule(scheduleData: any): Promise<boolean>;
    getScheduleStatistics(): Promise<any>;
    private getDayName;
    getEmptySlots(): Promise<any[]>;
    optimizeSchedule(): Promise<{
        success: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=ScheduleManager.d.ts.map