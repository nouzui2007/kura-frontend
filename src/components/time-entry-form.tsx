import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Clock, AlertCircle, ChevronRight, Moon, Sun } from 'lucide-react';
import { WorkingStaff } from './staff-selector';
import { ClockTimePicker } from './clock-time-picker';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { UserRole } from '../utils/auth';
import { SystemSettings, workAnalysisApi, WorkAnalysisResponse } from '../utils/api';

interface TimeEntryFormProps {
  workingStaffList: WorkingStaff[];
  onUpdateStaff: (staff: WorkingStaff) => void;
  userRole: UserRole;
  systemSettings: SystemSettings;
  currentDate: Date;
}

export function TimeEntryForm({ workingStaffList, onUpdateStaff, userRole, systemSettings, currentDate }: TimeEntryFormProps) {
  const [activeTimePicker, setActiveTimePicker] = useState<{ staffId: string; field: 'startTime' | 'endTime' } | null>(null);
  const [workAnalysisResults, setWorkAnalysisResults] = useState<Map<string, WorkAnalysisResponse>>(new Map());

  // 初回ロード時に既存の勤怠データの分析結果をセット
  useEffect(() => {
    const newResults = new Map<string, WorkAnalysisResponse>();
    workingStaffList.forEach(staff => {
      if (staff.analysisResult) {
        newResults.set(staff.id, staff.analysisResult);
      }
    });
    setWorkAnalysisResults(newResults);
  }, [workingStaffList.map(s => s.id).join(',')]);

  // 勤務分析を実行
  const analyzeWork = async (staffId: string, startTime: string, endTime: string) => {
    if (!startTime || !endTime) {
      setWorkAnalysisResults(prev => {
        const next = new Map(prev);
        next.delete(staffId);
        return next;
      });
      return;
    }

    const dateKey = currentDate.toISOString().split('T')[0];
    const result = await workAnalysisApi.analyze({
      staffId,
      workStartTime: startTime,
      workEndTime: endTime,
      date: dateKey,
    });

    if (result) {
      setWorkAnalysisResults(prev => {
        const next = new Map(prev);
        next.set(staffId, result);
        return next;
      });
    }
  };

  // workingStaffListが変更されたら既存データの勤務分析を実行
  useEffect(() => {
    workingStaffList.forEach(staff => {
      if (staff.startTime && staff.endTime) {
        analyzeWork(staff.id, staff.startTime, staff.endTime);
      }
    });
  }, [workingStaffList, currentDate]);

  const updateStaffTime = (id: string, field: 'startTime' | 'endTime', value: string) => {
    const staff = workingStaffList.find(s => s.id === id);
    if (staff) {
      const updatedStaff = { ...staff, [field]: value };
      onUpdateStaff(updatedStaff);
      
      // 両方の時間が入力されている場合は勤務分析を実行
      if (field === 'startTime' && staff.endTime) {
        analyzeWork(id, value, staff.endTime);
      } else if (field === 'endTime' && staff.startTime) {
        analyzeWork(id, staff.startTime, value);
      }
    }
  };

  const updateBreakMinutes = (id: string, minutes: number) => {
    const staff = workingStaffList.find(s => s.id === id);
    if (staff) {
      onUpdateStaff({ ...staff, breakMinutes: minutes });
    }
  };

  const formatTimeDisplay = (time: string): string => {
    if (!time) return '時間を選択';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (workingStaffList.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>出勤スタッフが選択されていません</p>
        <p className="text-sm">上の「スタッフ選択」から出勤者を選んでください</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {/* 出勤スタッフの時間入力 */}
        <div className="space-y-3">
          {workingStaffList.map((staff) => {
            // 退勤時間が出勤時間より早いかチェック
            const hasTimeError = staff.startTime && staff.endTime && 
              new Date(`2000-01-01T${staff.endTime}`) <= new Date(`2000-01-01T${staff.startTime}`);
            
            // 勤務分析結果を取得
            const analysisResult = workAnalysisResults.get(staff.id);
            
            return (
              <Card key={staff.id} className="p-4">
                <div className="mb-3">
                  <h3 className="font-medium">{staff.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {staff.department} | ID: {staff.employeeId}
                  </p>
                </div>
                
                {/* 時間入力エラーアラート */}
                {hasTimeError && (
                  <Alert className="mb-3 border-red-500 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      <strong>入力エラー:</strong> 退勤時間が出勤時間よりも早くなっています。時刻を確認してください。
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* 勤務分析結果のバッジ */}
                {analysisResult && !hasTimeError && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {analysisResult.earlyOvertime && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                        <Sun className="h-3 w-3 mr-1" />
                        早出残業あり
                      </Badge>
                    )}
                    {analysisResult.overtime && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                        <Clock className="h-3 w-3 mr-1" />
                        残業あり
                      </Badge>
                    )}
                    {analysisResult.earlyLeave && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        <ChevronRight className="h-3 w-3 mr-1" />
                        早上手当
                      </Badge>
                    )}
                    {analysisResult.lateNightOvertimeHours > 0 && (
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300">
                        <Moon className="h-3 w-3 mr-1" />
                        深夜残業: {analysisResult.lateNightOvertimeHours}時間
                      </Badge>
                    )}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-1 block">出勤時間</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 h-10"
                      onClick={() => setActiveTimePicker({ staffId: staff.id, field: 'startTime' })}
                    >
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className={staff.startTime ? 'text-foreground' : 'text-muted-foreground'}>
                        {formatTimeDisplay(staff.startTime)}
                      </span>
                    </Button>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-1 block">退勤時間</Label>
                    <Button
                      variant="outline"
                      className={`w-full justify-start gap-2 h-10 ${hasTimeError ? 'border-red-500 bg-red-50' : ''}`}
                      onClick={() => setActiveTimePicker({ staffId: staff.id, field: 'endTime' })}
                    >
                      <Clock className={`h-4 w-4 ${hasTimeError ? 'text-red-600' : 'text-muted-foreground'}`} />
                      <span className={hasTimeError ? 'text-red-700' : staff.endTime ? 'text-foreground' : 'text-muted-foreground'}>
                        {formatTimeDisplay(staff.endTime)}
                      </span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* 時計タイムピッカー */}
        {activeTimePicker && (
          <ClockTimePicker
            value={workingStaffList.find(s => s.id === activeTimePicker.staffId)?.[activeTimePicker.field] || ''}
            onChange={(time) => updateStaffTime(activeTimePicker.staffId, activeTimePicker.field, time)}
            label={activeTimePicker.field === 'startTime' ? '出勤時間' : '退勤時間'}
            isOpen={!!activeTimePicker}
            onOpenChange={(open) => !open && setActiveTimePicker(null)}
          />
        )}
      </div>
    </div>
  );
}
