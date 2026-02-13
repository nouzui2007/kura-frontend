/**
 * 給与計算ユーティリティ
 * 日本の労働基準法に基づいた給与計算を行います
 */

import { SystemSettings } from './api';

export interface AttendanceRecord {
  date: string;
  startTime: string | null;
  endTime: string | null;
  breakMinutes?: number | null; // 休憩時間（分）
  actualWorkHours?: number | null; // 実働時間（勤怠データに保存されている場合）
  overtimeHours?: number | null; // 残業時間（勤怠データに保存されている場合）
  isHoliday?: boolean;
}

export interface WorkHours {
  regularHours: number; // 通常勤務時間
  overtimeHours: number; // 残業時間（月45時間まで）
  excessOvertimeHours: number; // 残業時間（月45時間超）
  lateNightHours: number; // 深夜勤務時間（22:00-5:00）
  holidayHours: number; // 休日勤務時間
  totalHours: number; // 総勤務時間
}

export interface CustomPayrollItem {
  id: string;
  name: string;
  amount: number;
  type: 'allowance' | 'deduction'; // 手当 or 控除
}

export interface PayrollCalculation {
  staffId: string;
  staffName: string;
  month: string; // YYYY-MM
  workHours: WorkHours;
  baseSalary: number; // 基本給
  hourlyRate: number; // 時給
  overtimePay: number; // 残業代（25%増）
  excessOvertimePay: number; // 超過残業代（50%増）
  lateNightPay: number; // 深夜手当（25%増）
  holidayPay: number; // 休日手当（35%増）
  customItems: CustomPayrollItem[]; // カスタム項目
  totalAllowance: number; // 手当合計
  totalDeduction: number; // 控除合計
  grossPay: number; // 総支給額
  netPay: number; // 差引支給額
}

/**
 * 時刻文字列（HH:mm）を分に変換
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * 2つの時刻の差を時間で計算
 */
function calculateHoursBetween(startTime: string, endTime: string): number {
  let startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);
  
  // 日をまたぐ場合
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
}

/**
 * 深夜時間帯の勤務時間を計算
 */
function calculateLateNightHours(
  startTime: string, 
  endTime: string, 
  lateNightStartHour: number = 22, 
  lateNightEndHour: number = 5
): number {
  let startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);
  
  // 日をまたぐ場合
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  const lateNightStart = lateNightStartHour * 60;
  const lateNightEnd = (24 + lateNightEndHour) * 60;
  
  let lateNightMinutes = 0;
  
  // 22:00-24:00の範囲
  const nightStart1 = Math.max(startMinutes, lateNightStart);
  const nightEnd1 = Math.min(endMinutes, 24 * 60);
  if (nightStart1 < nightEnd1) {
    lateNightMinutes += nightEnd1 - nightStart1;
  }
  
  // 0:00-5:00の範囲（日をまたぐ場合）
  if (endMinutes > 24 * 60) {
    const nightStart2 = Math.max(startMinutes, 24 * 60);
    const nightEnd2 = Math.min(endMinutes, lateNightEnd);
    if (nightStart2 < nightEnd2) {
      lateNightMinutes += nightEnd2 - nightStart2;
    }
  }
  
  return lateNightMinutes / 60;
}

/**
 * 月次の勤怠データから労働時間を集計
 */
export function aggregateWorkHours(records: AttendanceRecord[], settings: SystemSettings): WorkHours {
  let regularHours = 0;
  let overtimeHours = 0;
  let excessOvertimeHours = 0;
  let lateNightHours = 0;
  let holidayHours = 0;
  let totalHours = 0;
  
  const REGULAR_HOURS_PER_DAY = settings.regularHoursPerDay;
  const OVERTIME_THRESHOLD = settings.overtimeThreshold;
  
  // 日ごとの勤務時間を計算
  const dailyHours: number[] = [];
  
  for (const record of records) {
    if (!record.startTime || !record.endTime) {
      continue;
    }
    
    // 勤怠データに実働時間と残業時間が保存されている場合はそれを優先
    let hours: number;
    let dailyOvertime: number;
    
    if (record.actualWorkHours !== undefined && record.actualWorkHours !== null &&
        record.overtimeHours !== undefined && record.overtimeHours !== null) {
      // 保存されたデータを使用
      hours = record.actualWorkHours + record.overtimeHours;
      dailyOvertime = record.overtimeHours;
    } else {
      // 出勤・退勤時間から計算
      const totalWorkHours = calculateHoursBetween(record.startTime, record.endTime);
      const breakHours = (record.breakMinutes || settings.defaultBreakMinutes) / 60;
      hours = Math.max(0, totalWorkHours - breakHours);
      dailyOvertime = Math.max(0, hours - REGULAR_HOURS_PER_DAY);
    }
    
    // 深夜時間の計算
    const lateNight = calculateLateNightHours(
      record.startTime, 
      record.endTime,
      settings.lateNightStartHour,
      settings.lateNightEndHour
    );
    
    totalHours += hours;
    lateNightHours += lateNight;
    
    if (record.isHoliday) {
      // 休日勤務
      holidayHours += hours;
    } else {
      // 通常日の勤務時間を分解
      const regularDaily = Math.min(hours, REGULAR_HOURS_PER_DAY);
      regularHours += regularDaily;
      
      // 残業時間の振り分け（月45時間の閾値を考慮）
      if (dailyOvertime > 0) {
        if (overtimeHours + excessOvertimeHours < OVERTIME_THRESHOLD) {
          const remaining = OVERTIME_THRESHOLD - (overtimeHours + excessOvertimeHours);
          if (dailyOvertime <= remaining) {
            overtimeHours += dailyOvertime;
          } else {
            overtimeHours += remaining;
            excessOvertimeHours += dailyOvertime - remaining;
          }
        } else {
          excessOvertimeHours += dailyOvertime;
        }
      }
    }
  }
  
  return {
    regularHours: Math.round(regularHours * 10) / 10,
    overtimeHours: Math.round(overtimeHours * 10) / 10,
    excessOvertimeHours: Math.round(excessOvertimeHours * 10) / 10,
    lateNightHours: Math.round(lateNightHours * 10) / 10,
    holidayHours: Math.round(holidayHours * 10) / 10,
    totalHours: Math.round(totalHours * 10) / 10,
  };
}

/**
 * 労働時間から給与を計算
 */
export function calculatePayroll(
  staffId: string,
  staffName: string,
  month: string,
  workHours: WorkHours,
  hourlyRate: number,
  customItems: CustomPayrollItem[] = [],
  settings: SystemSettings
): PayrollCalculation {
  // 基本給（通常勤務時間）
  const baseSalary = Math.round(workHours.regularHours * hourlyRate);
  
  // 残業代（設定された割増率）
  const overtimeRate = 1 + (settings.overtimeRate / 100);
  const overtimePay = Math.round(workHours.overtimeHours * hourlyRate * overtimeRate);
  
  // 超過残業代（設定された割増率）
  const excessOvertimeRate = 1 + (settings.excessOvertimeRate / 100);
  const excessOvertimePay = Math.round(workHours.excessOvertimeHours * hourlyRate * excessOvertimeRate);
  
  // 深夜手当（設定された割増率）
  const lateNightRate = settings.lateNightRate / 100;
  const lateNightPay = Math.round(workHours.lateNightHours * hourlyRate * lateNightRate);
  
  // 休日手当（設定された割増率）
  const holidayRate = 1 + (settings.holidayRate / 100);
  const holidayPay = Math.round(workHours.holidayHours * hourlyRate * holidayRate);
  
  // カスタム項目の集計
  const totalAllowance = customItems
    .filter(item => item.type === 'allowance')
    .reduce((sum, item) => sum + item.amount, 0);
    
  const totalDeduction = customItems
    .filter(item => item.type === 'deduction')
    .reduce((sum, item) => sum + item.amount, 0);
  
  // 総支給額
  const grossPay = baseSalary + overtimePay + excessOvertimePay + lateNightPay + holidayPay + totalAllowance;
  
  // 差引支給額
  const netPay = grossPay - totalDeduction;
  
  return {
    staffId,
    staffName,
    month,
    workHours,
    baseSalary,
    hourlyRate,
    overtimePay,
    excessOvertimePay,
    lateNightPay,
    holidayPay,
    customItems,
    totalAllowance,
    totalDeduction,
    grossPay,
    netPay,
  };
}

/**
 * 月の最初の日を取得
 */
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * 月の最後の日を取得
 */
export function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * 月の文字列（YYYY-MM）を取得
 */
export function getMonthString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 日付を文字列に変換（YYYY-MM-DD）
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日付が休日かどうかを判定（簡易版：土日のみ）
 */
export function isHoliday(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 日曜日または土曜日
}
