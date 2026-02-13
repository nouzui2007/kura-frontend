import { useState, useEffect } from 'react';
import { StaffManagement } from './staff-management';
import { StaffRegistrationForm } from './staff-registration-form';
import { staffApi, Staff } from '../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Users, UserPlus } from 'lucide-react';
import { Button } from './ui/button';

type ViewMode = 'list' | 'register' | 'edit';

export function StaffPage() {
  const [masterStaffList, setMasterStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingStaff, setEditingStaff] = useState<Staff | undefined>(undefined);

  // スタッフマスターを読み込み
  const loadMasterStaff = async () => {
    const staffList = await staffApi.getAll();
    setMasterStaffList(staffList);
  };

  // スタッフマスター管理のハンドラ
  const handleCreateStaff = async (staff: Omit<Staff, 'id'>) => {
    await staffApi.create(staff as Staff);
  };

  const handleUpdateStaff = async (staff: Staff) => {
    await staffApi.update(staff);
  };

  const handleDeleteStaff = async (id: string) => {
    await staffApi.delete(id);
  };

  const handleStaffChange = async () => {
    await loadMasterStaff();
  };

  // 登録フォームからの保存
  const handleSaveFromForm = async (staff: Staff) => {
    if (editingStaff) {
      await handleUpdateStaff(staff);
    } else {
      await handleCreateStaff(staff);
    }
    await handleStaffChange();
    setViewMode('list');
    setEditingStaff(undefined);
  };

  // 編集モードに切り替え
  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setViewMode('edit');
  };

  // 新規登録モードに切り替え
  const handleNewRegistration = () => {
    setEditingStaff(undefined);
    setViewMode('register');
  };

  // 一覧に戻る
  const handleBackToList = () => {
    setViewMode('list');
    setEditingStaff(undefined);
  };

  // 初回ロード
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadMasterStaff();
      setIsLoading(false);
    };
    init();
  }, []);

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

  // 登録・編集フォーム表示
  if (viewMode === 'register' || viewMode === 'edit') {
    return (
      <div className="space-y-6">
        <StaffRegistrationForm
          staff={editingStaff}
          onSave={handleSaveFromForm}
          onCancel={handleBackToList}
        />
      </div>
    );
  }

  // 一覧表示
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl mb-2 flex items-center gap-2">
            <Users className="h-6 w-6" />
            スタッフ管理
          </h2>
          <p className="text-muted-foreground">
            従業員情報の登録・編集・削除を行います
          </p>
        </div>
        <Button onClick={handleNewRegistration} size="lg">
          <UserPlus className="h-5 w-5 mr-2" />
          新規登録
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>スタッフ一覧</CardTitle>
          <CardDescription>
            登録されているスタッフの情報を管理できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StaffManagement
            staffList={masterStaffList}
            onStaffChange={handleStaffChange}
            onDeleteStaff={handleDeleteStaff}
            onEdit={handleEdit}
          />
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
        💡 ヒント: スタッフを登録した後、「勤怠入力」ページから出勤スタッフを選択して勤務時間を記録できます
      </div>
    </div>
  );
}