import { useState } from 'react';
import { Button } from './ui/button';
import { Users, Edit, Trash2 } from 'lucide-react';
import { Staff } from '../utils/api';

interface StaffManagementProps {
  staffList: Staff[];
  onStaffChange: () => void;
  onDeleteStaff: (id: string) => Promise<void>;
  onEdit: (staff: Staff) => void;
}

export function StaffManagement({ 
  staffList, 
  onStaffChange,
  onDeleteStaff,
  onEdit
}: StaffManagementProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm('このスタッフを削除してもよろしいですか？')) {
      return;
    }

    setIsLoading(true);
    try {
      await onDeleteStaff(id);
      onStaffChange();
    } catch (error) {
      console.error('Error deleting staff:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {staffList.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p className="text-sm">スタッフが登録されていません</p>
          <p className="text-xs mt-1">「新規登録」ボタンから追加してください</p>
        </div>
      ) : (
        staffList.map((staff) => (
          <div 
            key={staff.id} 
            className="flex items-center justify-between p-3 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1">
              <div className="font-medium text-sm">
                {staff.name || `${staff.lastName || ''} ${staff.firstName || ''}`.trim()}
              </div>
              <div className="text-xs text-muted-foreground">
                {staff.department} | ID: {staff.employeeId}
              </div>
              {(staff.hourlyRate || staff.monthlySalary) && (
                <div className="text-xs text-muted-foreground mt-1">
                  {staff.hourlyRate && `時給: ¥${staff.hourlyRate.toLocaleString()}`}
                  {staff.hourlyRate && staff.monthlySalary && ' / '}
                  {staff.monthlySalary && `月給: ¥${staff.monthlySalary.toLocaleString()}`}
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(staff)}
                disabled={isLoading}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(staff.id)}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}