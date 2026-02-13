import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Users, UserPlus } from 'lucide-react';

export interface MasterStaff {
  id: string;
  name: string;
  department: string;
  employeeId: string;
}

export interface WorkingStaff extends MasterStaff {
  startTime: string;
  endTime: string;
  breakMinutes: number; // 休憩時間（分）
  isSelected: boolean;
  isExisting?: boolean; // 既存データかどうかのフラグ
  attendanceId?: string; // 勤怠データのID（更新時に使用）
}

interface StaffSelectorProps {
  masterStaffList: MasterStaff[];
  workingStaffList: WorkingStaff[];
  onUpdateWorkingStaff: (staff: WorkingStaff[]) => void;
  onUpdateWorkingStaffWithDelete?: (staff: WorkingStaff[], deletedStaffId?: string) => void;
}

export function StaffSelector({ 
  masterStaffList, 
  workingStaffList, 
  onUpdateWorkingStaff,
  onUpdateWorkingStaffWithDelete
}: StaffSelectorProps) {
  const [showSelector, setShowSelector] = useState(false);

  const toggleStaffSelection = (masterStaff: MasterStaff) => {
    const existingStaff = workingStaffList.find(ws => ws.id === masterStaff.id);
    
    if (existingStaff) {
      // 既に選択済みの場合は削除
      const newList = workingStaffList.filter(ws => ws.id !== masterStaff.id);
      if (onUpdateWorkingStaffWithDelete) {
        // 削除時はデータベースからも削除
        onUpdateWorkingStaffWithDelete(newList, masterStaff.id);
      } else {
        onUpdateWorkingStaff(newList);
      }
    } else {
      // 新規選択の場合は追加（保存なし）
      const newWorkingStaff: WorkingStaff = {
        ...masterStaff,
        startTime: '',
        endTime: '',
        breakMinutes: 60, // デフォルト60分
        isSelected: true
      };
      onUpdateWorkingStaff([...workingStaffList, newWorkingStaff]);
    }
  };

  const selectedCount = workingStaffList.length;
  const availableStaff = masterStaffList.filter(master => 
    !workingStaffList.some(working => working.id === master.id)
  );

  if (!showSelector) {
    return (
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">
              出勤スタッフ {selectedCount > 0 && `(${selectedCount}名)`}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowSelector(true)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            スタッフ選択
          </Button>
        </div>
        
        {selectedCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {workingStaffList.map((staff) => (
              <Badge key={staff.id} variant="secondary" className="text-xs">
                {staff.name} ({staff.department})
              </Badge>
            ))}
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">出勤スタッフを選択</h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowSelector(false)}
        >
          完了
        </Button>
      </div>

      <div className="space-y-3 max-h-60 overflow-y-auto">
        {/* 選択済みスタッフ */}
        {workingStaffList.map((staff) => (
          <div key={staff.id} className="flex items-center space-x-3 p-2 bg-primary/5 rounded-md">
            <Checkbox
              checked={true}
              onCheckedChange={() => toggleStaffSelection(staff)}
            />
            <div className="flex-1">
              <div className="font-medium text-sm">{staff.name}</div>
              <div className="text-xs text-muted-foreground">
                {staff.department} | ID: {staff.employeeId}
              </div>
            </div>
            <Badge variant="default" className="text-xs">選択中</Badge>
          </div>
        ))}

        {/* 選択可能スタッフ */}
        {availableStaff.map((staff) => (
          <div key={staff.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md">
            <Checkbox
              checked={false}
              onCheckedChange={() => toggleStaffSelection(staff)}
            />
            <div className="flex-1">
              <div className="font-medium text-sm">{staff.name}</div>
              <div className="text-xs text-muted-foreground">
                {staff.department} | ID: {staff.employeeId}
              </div>
            </div>
          </div>
        ))}
      </div>

      {availableStaff.length === 0 && workingStaffList.length > 0 && (
        <div className="text-center text-sm text-muted-foreground py-4">
          全てのスタッフが選択済みです
        </div>
      )}
    </Card>
  );
}