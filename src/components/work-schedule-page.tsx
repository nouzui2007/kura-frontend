import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, Sun, Clock, Moon } from 'lucide-react';
import { staffApi, attendanceApi, Staff, Attendance } from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface MonthlyAttendance {
  [staffId: string]: {
    [day: number]: Attendance;
  };
}

interface StaffSummary {
  workDays: number;
  earlyOvertimeCount: number;
  overtimeCount: number;
  earlyLeaveCount: number;
  totalLateNightHours: number;
}

export function WorkSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [attendanceData, setAttendanceData] = useState<MonthlyAttendance>({});
  const [isLoading, setIsLoading] = useState(false);

  // スタッフ一覧を取得
  useEffect(() => {
    loadStaffList();
  }, []);

  // 月が変わったら勤怠データを取得
  useEffect(() => {
    loadMonthlyAttendance();
  }, [currentDate, staffList]);

  const loadStaffList = async () => {
    try {
      const staff = await staffApi.getAll();
      setStaffList(staff);
    } catch (error) {
      console.error('スタッフ一覧の取得に失敗しました:', error);
      toast.error('スタッフ一覧の取得に失敗しました');
    }
  };

  const loadMonthlyAttendance = async () => {
    if (staffList.length === 0) return;

    setIsLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;

      const allAttendance = await attendanceApi.getByMonth(monthStr);

      // スタッフID × 日付 のマップを作成
      const dataMap: MonthlyAttendance = {};
      allAttendance.forEach(att => {
        const day = new Date(att.date).getDate();
        if (!dataMap[att.staffId]) {
          dataMap[att.staffId] = {};
        }
        dataMap[att.staffId][day] = att;
      });

      setAttendanceData(dataMap);
    } catch (error) {
      console.error('勤怠データの取得に失敗しました:', error);
      toast.error('勤怠データの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 前月へ
  const goToPreviousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  // 次月へ
  const goToNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  // 今月へ
  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // 月の日数を取得
  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // スタッフのサマリーを計算
  const calculateSummary = (staffId: string): StaffSummary => {
    const staffAttendance = attendanceData[staffId] || {};
    let workDays = 0;
    let earlyOvertimeCount = 0;
    let overtimeCount = 0;
    let earlyLeaveCount = 0;
    let totalLateNightHours = 0;

    Object.values(staffAttendance).forEach(att => {
      if (att.startTime && att.endTime) {
        workDays++;
      }
      if (att.earlyOvertime) {
        earlyOvertimeCount++;
      }
      if (att.overtime) {
        overtimeCount++;
      }
      if (att.earlyLeave) {
        earlyLeaveCount++;
      }
      totalLateNightHours += att.lateNightOvertimeHours || 0;
    });

    return {
      workDays,
      earlyOvertimeCount,
      overtimeCount,
      earlyLeaveCount,
      totalLateNightHours,
    };
  };

  // 時間フォーマット（24時間表示）
  const formatTime = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const daysInMonth = getDaysInMonth(currentDate);

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">勤務表</h2>
        </div>
      </div>

      {/* 月選択 */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousMonth}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            前月
          </Button>

          <div className="flex items-center gap-3">
            <div className="text-xl font-bold">
              {year}年 {month}月
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToCurrentMonth}
            >
              今月
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToNextMonth}
            className="gap-2"
          >
            次月
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* 勤務表 */}
      <Card className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : staffList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>スタッフが登録されていません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-border bg-muted p-2 text-sm font-medium sticky left-0 z-10">
                    日付
                  </th>
                  {staffList.map(staff => (
                    <th
                      key={staff.id}
                      className="border border-border bg-muted p-2 text-sm font-medium min-w-[120px]"
                    >
                      <div>{staff.name}</div>
                      <div className="text-xs text-muted-foreground font-normal">
                        {staff.employeeId}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const date = new Date(year, month - 1, day);
                  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                  return (
                    <tr key={day}>
                      <td
                        className={`border border-border p-2 text-sm sticky left-0 z-10 ${
                          isWeekend ? 'bg-red-50' : 'bg-background'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{day}</span>
                          <span className={`text-xs ${isWeekend ? 'text-red-600' : 'text-muted-foreground'}`}>
                            ({dayOfWeek})
                          </span>
                        </div>
                      </td>
                      {staffList.map(staff => {
                        const attendance = attendanceData[staff.id]?.[day];
                        
                        // デバッグ: 深夜残業時間が0の場合の確認
                        if (attendance && attendance.lateNightOvertimeHours === 0) {
                          console.log('深夜残業時間が0のattendance:', staff.name, day, attendance);
                        }
                        
                        return (
                          <td
                            key={staff.id}
                            className={`border border-border p-2 text-xs align-top ${
                              isWeekend ? 'bg-red-50' : 'bg-background'
                            }`}
                          >
                            {attendance ? (
                              <div className="space-y-1.5">
                                {/* 上段：出勤・退勤時間（横並び） */}
                                <div className="flex items-center justify-center gap-1">
                                  <span className="font-medium">{formatTime(attendance.startTime)}</span>
                                  <span className="text-muted-foreground">〜</span>
                                  <span className="font-medium">{formatTime(attendance.endTime)}</span>
                                </div>
                                
                                {/* 下段：バッジ */}
                                <div className="flex flex-wrap gap-1 justify-center min-h-[16px]">
                                  {attendance.earlyOvertime && (
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-[10px] px-1 py-0 h-4">
                                      <Sun className="h-2.5 w-2.5 mr-0.5" />
                                      早出
                                    </Badge>
                                  )}
                                  {attendance.overtime && (
                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-[10px] px-1 py-0 h-4">
                                      <Clock className="h-2.5 w-2.5 mr-0.5" />
                                      残業
                                    </Badge>
                                  )}
                                  {attendance.earlyLeave && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-[10px] px-1 py-0 h-4">
                                      早上
                                    </Badge>
                                  )}
                                  {(attendance.lateNightOvertimeHours > 0) && (
                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 text-[10px] px-1 py-0 h-4">
                                      <Moon className="h-2.5 w-2.5 mr-0.5" />
                                      深夜 {attendance.lateNightOvertimeHours.toFixed(1)}h
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-muted-foreground">-</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="border border-border bg-blue-50 p-2 text-sm font-medium sticky left-0 z-10">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span>サマリー</span>
                    </div>
                  </td>
                  {staffList.map(staff => {
                    const summary = calculateSummary(staff.id);
                    return (
                      <td key={staff.id} className="border border-border bg-blue-50 p-2 text-xs">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">出勤日数:</span>
                            <span className="font-medium">{summary.workDays}日</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">早出残業:</span>
                            <span className="font-medium">{summary.earlyOvertimeCount}回</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">残業:</span>
                            <span className="font-medium">{summary.overtimeCount}回</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">早上手当:</span>
                            <span className="font-medium">{summary.earlyLeaveCount}回</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">深夜残業:</span>
                            <span className="font-medium">{summary.totalLateNightHours.toFixed(1)}h</span>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* 凡例 */}
      <Card className="p-4">
        <div className="text-sm">
          <h3 className="font-medium mb-2">凡例</h3>
          <div className="space-y-3">
            {/* バッジの説明 */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">バッジ:</div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-[10px] px-1 py-0 h-4">
                  <Sun className="h-2.5 w-2.5 mr-0.5" />
                  早出
                </Badge>
                <span className="text-xs text-muted-foreground">早出残業</span>
                
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-[10px] px-1 py-0 h-4">
                  <Clock className="h-2.5 w-2.5 mr-0.5" />
                  残業
                </Badge>
                <span className="text-xs text-muted-foreground">残業</span>
                
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-[10px] px-1 py-0 h-4">
                  早上
                </Badge>
                <span className="text-xs text-muted-foreground">早上手当</span>
                
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 text-[10px] px-1 py-0 h-4">
                  <Moon className="h-2.5 w-2.5 mr-0.5" />
                  深夜
                </Badge>
                <span className="text-xs text-muted-foreground">深夜残業</span>
              </div>
            </div>
            
            {/* サマリーの説明 */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">サマリー:</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div>• 出勤日数: 出勤時刻と退勤時刻が両方ある日の合計</div>
                <div>• 早出残業: 早出残業フラグがtrueの回数</div>
                <div>• 残業: 残業フラグがtrueの回数</div>
                <div>• 早上手当: 早上手当フラグがtrueの回数</div>
                <div>• 深夜残業: 深夜残業時間の合計</div>
                <div className="flex items-center gap-1">
                  • <span className="inline-block w-3 h-3 bg-red-50 border border-red-200"></span> 土日
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}