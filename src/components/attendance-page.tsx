import { useState, useEffect } from 'react';
import { TimeEntryForm } from './time-entry-form';
import { StaffSelector, WorkingStaff } from './staff-selector';
import { DateNavigator } from './date-navigator';
import { staffApi, attendanceApi, systemSettingsApi, workAnalysisApi, Staff, SystemSettings, DEFAULT_SYSTEM_SETTINGS } from '../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Clock } from 'lucide-react';
import { UserRole } from '../utils/auth';

interface AttendancePageProps {
  userRole: UserRole;
}

export function AttendancePage({ userRole }: AttendancePageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [masterStaffList, setMasterStaffList] = useState<Staff[]>([]);
  const [currentWorkingStaff, setCurrentWorkingStaff] = useState<WorkingStaff[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // 日付をキー用の文字列に変換
  const getDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // スタッフマスターを読み込み
  const loadMasterStaff = async () => {
    const staffList = await staffApi.getAll();
    setMasterStaffList(staffList);
  };

  // 指定日の勤怠データを読み込み
  const loadAttendance = async (date: Date) => {
    const dateKey = getDateKey(date);
    const attendanceList = await attendanceApi.getByDate(dateKey);
    
    // 勤怠データとスタッフマスターを結合
    const workingStaff: WorkingStaff[] = attendanceList.map(att => {
      const staff = masterStaffList.find(s => s.id === att.staffId);
      
      // データベースから勤務分析結果を復元
      let analysisResult = undefined;
      if (att.earlyOvertime !== undefined && att.earlyOvertime !== null || 
          att.overtime !== undefined && att.overtime !== null || 
          att.earlyLeave !== undefined && att.earlyLeave !== null || 
          att.lateNightOvertimeHours !== undefined && att.lateNightOvertimeHours !== null) {
        analysisResult = {
          earlyOvertime: att.earlyOvertime || false,
          overtime: att.overtime || false,
          earlyLeave: att.earlyLeave || false,
          lateNightOvertimeHours: att.lateNightOvertimeHours || 0,
        };
      }
      
      return {
        id: att.staffId,
        name: staff?.name || '',
        department: staff?.department || '',
        employeeId: staff?.employeeId || '',
        startTime: att.startTime,
        endTime: att.endTime,
        breakMinutes: att.breakMinutes || systemSettings.defaultBreakMinutes,
        isSelected: true,
        isExisting: true, // 既存データであることをマーク
        attendanceId: att.id, // 勤怠データのIDを保存
        analysisResult, // 勤務分析結果を含める
      };
    }).filter(ws => ws.name); // スタッフマスターに存在するもののみ
    
    setCurrentWorkingStaff(workingStaff);
  };

  // 勤怠データを保存
  const saveAttendance = async (workingStaff: WorkingStaff[]) => {
    const dateKey = getDateKey(currentDate);
    
    const attendanceList = workingStaff
      .filter(ws => ws.startTime && ws.endTime) // 出勤・退勤時間が両方入力されている場合のみ
      .map(ws => {
        const totalMinutes = calculateWorkMinutes(ws.startTime, ws.endTime);
        const workHours = Math.max(0, (totalMinutes - (ws.breakMinutes || 0)) / 60);
        
        return {
          date: dateKey,
          staffId: ws.id,
          startTime: ws.startTime,
          endTime: ws.endTime,
          workHours, // 実働時間（時間単位）
          breakMinutes: ws.breakMinutes || 0,
        };
      });
    
    if (attendanceList.length > 0) {
      await attendanceApi.saveBulk(dateKey, attendanceList);
    }
  };

  // 個別スタッフの勤怠データを保存
  const saveStaffAttendance = async (staff: WorkingStaff) => {
    // 出勤・退勤時間が両方入力されていない場合は保存しない
    if (!staff.startTime || !staff.endTime) {
      return;
    }
    
    const dateKey = getDateKey(currentDate);
    const totalMinutes = calculateWorkMinutes(staff.startTime, staff.endTime);
    const workHours = Math.max(0, (totalMinutes - (staff.breakMinutes || 0)) / 60);
    
    // work-analysis APIを呼び出して勤務分析を実行
    let analysisResult = null;
    try {
      analysisResult = await workAnalysisApi.analyze({
        staffId: staff.id,
        workStartTime: staff.startTime,
        workEndTime: staff.endTime,
        date: dateKey,
      });
    } catch (error) {
      console.error('勤務分析に失敗しました:', error);
      // 分析に失敗してもデータ保存は続行
    }
    
    // データを準備（work-analysis結果を含める）
    const attendanceData = {
      date: dateKey,
      staffId: staff.id,
      startTime: staff.startTime,
      endTime: staff.endTime,
      workHours,
      breakMinutes: staff.breakMinutes || 0,
      // work-analysis結果を含める
      earlyOvertime: analysisResult?.earlyOvertime || false,
      overtime: analysisResult?.overtime || false,
      earlyLeave: analysisResult?.earlyLeave || false,
      lateNightOvertimeHours: analysisResult?.lateNightOvertimeHours || 0,
    };
    
    // 既存データの場合は更新、新規データの場合は登録
    if (staff.isExisting && staff.attendanceId) {
      // 更新処理
      try {
        await attendanceApi.update(staff.attendanceId, attendanceData);
      } catch (error) {
        console.error('勤怠データの更新に失敗しました:', error);
        // 更新に失敗した場合、再度既存データを確認してリトライ
        const existingList = await attendanceApi.getByDate(dateKey);
        const existing = existingList.find(att => att.staffId === staff.id);
        if (existing && existing.id !== staff.attendanceId) {
          // IDが変わっている場合は新しいIDで更新
          await attendanceApi.update(existing.id, attendanceData);
          // ローカルステートを更新
          const updatedStaff = { 
            ...staff, 
            attendanceId: existing.id,
            analysisResult: analysisResult || undefined,
          };
          setCurrentWorkingStaff(prev => 
            prev.map(s => s.id === staff.id ? updatedStaff : s)
          );
        } else {
          throw error;
        }
      }
    } else {
      // 新規登録の前に、同じ日付・スタッフで既存データがないか確認
      try {
        // まず既存データを取得して確認
        const existingList = await attendanceApi.getByDate(dateKey);
        const existing = existingList.find(att => att.staffId === staff.id);
        
        if (existing) {
          // 既存データがある場合は更新
          await attendanceApi.update(existing.id, attendanceData);
          
          // ローカルステートも更新
          const updatedStaff = { 
            ...staff, 
            isExisting: true,
            attendanceId: existing.id,
            analysisResult: analysisResult || undefined,
          };
          setCurrentWorkingStaff(prev => 
            prev.map(s => s.id === staff.id ? updatedStaff : s)
          );
        } else {
          // 既存データがない場合は新規登録
          try {
            const result = await attendanceApi.save(attendanceData);
            
            // 保存成功後、既存データフラグとIDを保存
            if (result && result.id) {
              const updatedStaff = { 
                ...staff, 
                isExisting: true,
                attendanceId: result.id,
                analysisResult: analysisResult || undefined,
              };
              setCurrentWorkingStaff(prev => 
                prev.map(s => s.id === staff.id ? updatedStaff : s)
              );
            }
          } catch (saveError: any) {
            // 重複エラーの場合は、再度既存データを取得して更新
            if (saveError?.message?.includes('duplicate') || saveError?.message?.includes('unique constraint')) {
              console.warn('重複エラーを検出しました。更新処理にフォールバックします。');
              const retryList = await attendanceApi.getByDate(dateKey);
              const retryExisting = retryList.find(att => att.staffId === staff.id);
              
              if (retryExisting) {
                await attendanceApi.update(retryExisting.id, attendanceData);
                
                // ローカルステートを更新
                const updatedStaff = { 
                  ...staff, 
                  isExisting: true,
                  attendanceId: retryExisting.id,
                  analysisResult: analysisResult || undefined,
                };
                setCurrentWorkingStaff(prev => 
                  prev.map(s => s.id === staff.id ? updatedStaff : s)
                );
              } else {
                throw saveError;
              }
            } else {
              throw saveError;
            }
          }
        }
      } catch (error) {
        console.error('勤怠データの保存に失敗しました:', error);
        throw error;
      }
    }
  };

  // スタッフ削除時にデータベースからも削除
  const deleteStaffAttendance = async (staffId: string) => {
    const dateKey = getDateKey(currentDate);
    await attendanceApi.delete(dateKey, staffId);
  };

  // 勤務時間を分単位で計算
  const calculateWorkMinutes = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    return endMinutes - startMinutes;
  };

  // 出勤スタッフデータを更新（ローカルステートのみ・保存なし）
  const updateWorkingStaffLocal = (newWorkingStaff: WorkingStaff[]) => {
    setCurrentWorkingStaff(newWorkingStaff);
  };

  // 出勤スタッフデータを更新（削除付き）
  const updateWorkingStaffWithDelete = async (newWorkingStaff: WorkingStaff[], deletedStaffId?: string) => {
    setCurrentWorkingStaff(newWorkingStaff);
    // スタッフが削除された場合、データベースからも削除
    if (deletedStaffId) {
      await deleteStaffAttendance(deletedStaffId);
    }
  };

  // 個別スタッフの時刻・休憩時間を更新（該当スタッフのみ保存）
  const updateStaffAndSave = async (updatedStaff: WorkingStaff) => {
    // ローカルステートを更新
    const newWorkingStaff = currentWorkingStaff.map(staff => 
      staff.id === updatedStaff.id ? updatedStaff : staff
    );
    setCurrentWorkingStaff(newWorkingStaff);
    
    // 該当スタッフのみデータベースに保存
    await saveStaffAttendance(updatedStaff);
  };

  // 初回ロード
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const [staffList, settings] = await Promise.all([
        staffApi.getAll(),
        systemSettingsApi.get()
      ]);
      setMasterStaffList(staffList);
      setSystemSettings(settings);
      setIsLoading(false);
    };
    init();
  }, []);

  // スタッフマスターロード後に勤怠データを読み込み
  useEffect(() => {
    if (masterStaffList.length > 0) {
      loadAttendance(currentDate);
    }
  }, [currentDate, masterStaffList]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-2 flex items-center gap-2">
          <Clock className="h-6 w-6" />
          勤怠入力
        </h2>
        <p className="text-muted-foreground">
          スタッフの出勤・退勤時間を記録します
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>日付選択</CardTitle>
          <CardDescription>
            勤怠を記録する日付を選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DateNavigator 
            currentDate={currentDate} 
            onDateChange={setCurrentDate} 
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>出勤スタッフ選択</CardTitle>
          <CardDescription>
            出勤するスタッフを選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StaffSelector
            masterStaffList={masterStaffList}
            workingStaffList={currentWorkingStaff}
            onUpdateWorkingStaff={updateWorkingStaffLocal}
            onUpdateWorkingStaffWithDelete={updateWorkingStaffWithDelete}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>勤務時間入力</CardTitle>
          <CardDescription>
            各スタッフの開始時刻と終了時刻を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimeEntryForm
            workingStaffList={currentWorkingStaff}
            onUpdateStaff={updateStaffAndSave}
            userRole={userRole}
            systemSettings={systemSettings}
            currentDate={currentDate}
          />
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
        💡 入力したデータは自動的に保存されます
      </div>
    </div>
  );
}