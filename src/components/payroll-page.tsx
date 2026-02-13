import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  Calculator, 
  ChevronLeft, 
  ChevronRight, 
  Edit2, 
  Save, 
  Plus,
  Trash2,
  DollarSign,
  AlertCircle,
  Download,
  Info
} from 'lucide-react';
import { staffApi, attendanceApi, payrollApi, systemSettingsApi, Staff, PayrollData, SystemSettings, DEFAULT_SYSTEM_SETTINGS } from '../utils/api';
import { 
  getMonthString
} from '../utils/payroll';
import { toast } from 'sonner@2.0.3';

interface DisplayPayroll {
  staffId: string;
  staffName: string;
  month: string;
  
  // 勤務時間情報
  regularHours: number;
  overtimeHours: number;
  totalWorkHours: number; // 合計実働時間（実働時間の合計）
  workDays: number;
  
  // 給与情報
  baseSalary: number; // 基本給（月給 or 時給×時間）
  hourlyRate?: number; // 時給
  overtimePay: number; // 残業代
  
  // 手当と控除
  allowances: Array<{ name: string; amount: number }>;
  allowancesTotal: number;
  deductions: Array<{ name: string; amount: number }>;
  deductionsTotal: number;
  
  // 合計
  grossPay: number; // 総支給額
  netPay: number; // 差引支給額
  
  // 編集用
  isEditing: boolean;
  payrollId?: string; // データベースのID
}

export function PayrollPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [payrollList, setPayrollList] = useState<DisplayPayroll[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<DisplayPayroll | null>(null);
  const [showCustomItemDialog, setShowCustomItemDialog] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemAmount, setCustomItemAmount] = useState('');
  const [customItemType, setCustomItemType] = useState<'allowance' | 'deduction'>('allowance');

  // スタッフマスターと給与データを読み込み
  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const loadData = async () => {
    setIsLoading(true);
    
    // スタッフマスターとシステム設定を取得
    const [staff, settings] = await Promise.all([
      staffApi.getAll(),
      systemSettingsApi.get()
    ]);
    setStaffList(staff);
    setSystemSettings(settings);
    
    // 月次給与データを取得
    const monthStr = getMonthString(currentMonth);
    const payroll = await payrollApi.getByMonth(monthStr);
    
    // 既存の給与データをマップに変換
    const payrollMap = new Map<string, PayrollData>();
    payroll.forEach(p => {
      payrollMap.set(p.staffId, p);
    });
    
    // DisplayPayrollの形式に変換
    const displayPayroll: DisplayPayroll[] = staff.map(s => {
      const existing = payrollMap.get(s.id);
      if (existing && existing.data) {
        // APIから返ってきたデータを表示用に変換
        const data = existing.data;
        return {
          staffId: s.id,
          staffName: s.name,
          month: existing.month,
          payrollId: existing.id,
          
          // 勤務時間情報
          regularHours: data.regularHours || 0,
          overtimeHours: data.overtimeHours || 0,
          totalWorkHours: data.totalWorkHours || 0,
          workDays: data.workDays || 0,
          
          // 給与情報
          baseSalary: data.baseSalary || data.basePay || 0,
          hourlyRate: data.hourlyRate,
          overtimePay: data.overtimePay || 0,
          
          // 手当と控除
          allowances: data.allowances || [],
          allowancesTotal: data.allowancesTotal || 0,
          deductions: data.deductions || [],
          deductionsTotal: data.deductionsTotal || 0,
          
          // 合計
          grossPay: (data.baseSalary || data.basePay || 0) + (data.overtimePay || 0) + (data.allowancesTotal || 0),
          netPay: data.total || 0,
          
          isEditing: false,
        };
      } else {
        // 新規の場合は空のデータ
        return {
          staffId: s.id,
          staffName: s.name,
          month: monthStr,
          regularHours: 0,
          overtimeHours: 0,
          totalWorkHours: 0,
          workDays: 0,
          baseSalary: 0,
          hourlyRate: 0,
          overtimePay: 0,
          allowances: [],
          allowancesTotal: 0,
          deductions: [],
          deductionsTotal: 0,
          grossPay: 0,
          netPay: 0,
          isEditing: false,
        };
      }
    });
    
    setPayrollList(displayPayroll);
    setIsLoading(false);
  };

  // 給与を自動計算
  const handleCalculatePayroll = async () => {
    setIsCalculating(true);
    
    try {
      const monthStr = getMonthString(currentMonth);
      console.log('給与計算開始:', { monthStr });
      
      // サーバーサイドで給与計算を実行
      const result = await payrollApi.calculate(monthStr);
      
      if (!result) {
        toast.error('給与計算に失敗しました');
        setIsCalculating(false);
        return;
      }
      
      // 計算結果をロード
      await loadData();
      
      toast.success(`給与計算が完了しました`);
    } catch (error) {
      console.error('Error calculating payroll:', error);
      toast.error('給与計算中にエラーが発生しました: ' + String(error));
    } finally {
      setIsCalculating(false);
    }
  };

  // 給与データを保存
  const handleSavePayroll = async (payroll: DisplayPayroll) => {
    try {
      const payrollData: PayrollData = {
        id: `${payroll.month}-${payroll.staffId}`,
        staffId: payroll.staffId,
        month: payroll.month,
        baseSalary: payroll.baseSalary,
        hourlyRate: payroll.hourlyRate,
        overtimePay: payroll.overtimePay,
        allowances: payroll.allowances,
        allowancesTotal: payroll.allowancesTotal,
        deductions: payroll.deductions,
        deductionsTotal: payroll.deductionsTotal,
        grossPay: payroll.grossPay,
        netPay: payroll.netPay,
        regularHours: payroll.regularHours,
        overtimeHours: payroll.overtimeHours,
        totalWorkHours: payroll.totalWorkHours,
        workDays: payroll.workDays,
      };
      
      await payrollApi.save(payrollData);
      
      // 編集モードを解除
      setPayrollList(prev => 
        prev.map(p => 
          p.staffId === payroll.staffId 
            ? { ...p, isEditing: false }
            : p
        )
      );
      
      toast.success('給与データを保存しました');
    } catch (error) {
      console.error('Error saving payroll:', error);
      toast.error('保存中にエラーが発生しました');
    }
  };

  // すべての給与データを保存
  const handleSaveAll = async () => {
    setIsLoading(true);
    
    try {
      for (const payroll of payrollList) {
        if (payroll.grossPay > 0) {
          await handleSavePayroll(payroll);
        }
      }
      
      toast.success('すべての給与データを保存しました');
    } catch (error) {
      console.error('Error saving all payroll:', error);
      toast.error('保存中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // カスタム項目を追加
  const handleAddCustomItem = async () => {
    if (!selectedStaff || !customItemName || !customItemAmount) {
      toast.error('すべての項目を入力してください');
      return;
    }
    
    const newItem: { name: string; amount: number } = {
      name: customItemName,
      amount: parseInt(customItemAmount),
    };
    
    // カスタム項目を追加
    const updatedCustomItems = [...selectedStaff.customItems, newItem];
    
    // 手当と控除を再計算
    const totalAllowance = updatedCustomItems
      .filter(item => item.type === 'allowance')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const totalDeduction = updatedCustomItems
      .filter(item => item.type === 'deduction')
      .reduce((sum, item) => sum + item.amount, 0);
    
    // 給与合計を再計算
    const baseGrossPay = selectedStaff.baseSalary + 
                         selectedStaff.overtimePay + 
                         totalAllowance;
    
    const grossPay = baseGrossPay;
    const netPay = grossPay - totalDeduction;
    
    const updated = {
      ...selectedStaff,
      customItems: updatedCustomItems,
      totalAllowance,
      totalDeduction,
      grossPay,
      netPay,
      isEditing: true,
    };
    
    setPayrollList(prev =>
      prev.map(p =>
        p.staffId === selectedStaff.staffId ? updated : p
      )
    );
    
    setSelectedStaff(updated);
    setShowCustomItemDialog(false);
    setCustomItemName('');
    setCustomItemAmount('');
    setCustomItemType('allowance');
    
    toast.success('カスタム項目を追加しました');
  };

  // カスタム項目を削除
  const handleRemoveCustomItem = (itemId: string) => {
    if (!selectedStaff) return;
    
    const updatedCustomItems = selectedStaff.customItems.filter(item => item.id !== itemId);
    
    // 手当と控除を再計算
    const totalAllowance = updatedCustomItems
      .filter(item => item.type === 'allowance')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const totalDeduction = updatedCustomItems
      .filter(item => item.type === 'deduction')
      .reduce((sum, item) => sum + item.amount, 0);
    
    // 給与合計を再計算
    const baseGrossPay = selectedStaff.baseSalary + 
                         selectedStaff.overtimePay + 
                         totalAllowance;
    
    const grossPay = baseGrossPay;
    const netPay = grossPay - totalDeduction;
    
    const updated = {
      ...selectedStaff,
      customItems: updatedCustomItems,
      totalAllowance,
      totalDeduction,
      grossPay,
      netPay,
      isEditing: true,
    };
    
    setPayrollList(prev =>
      prev.map(p =>
        p.staffId === selectedStaff.staffId ? updated : p
      )
    );
    
    setSelectedStaff(updated);
    toast.success('カスタム項目を削除しました');
  };

  // 月を変更
  const handlePreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // 金額をフォーマット
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

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
      {/* ヘッダー */}
      <div>
        <h2 className="text-2xl mb-2 flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          給与計算
        </h2>
        <p className="text-muted-foreground">
          勤怠データから給与を自動計算し、カスタム項目を追加できます
        </p>
      </div>

      {/* お知らせ */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>日本の労働基準法に準拠</strong> - 残業代（25%増）、超過残業代（50%増）、深夜手当（25%増）、休日手当（35%増）を自動計算します。
        </AlertDescription>
      </Alert>

      {/* 使い方ガイド */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>使い方:</strong> 
          1. 先に「スタッフマスター管理」で各スタッフの時給または月給を設定してください
          2. 「勤怠入力」ページで勤務時間を入力してください
          3. 「給与を計算」ボタンをクリックして給与を自動計算します
          4. カスタム項目で手当や控除を追加できます
          5. 「すべて保存」で給与データを保存します
        </AlertDescription>
      </Alert>

      {/* 月次選択と操作 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center min-w-[140px]">
                <p className="text-sm text-muted-foreground">対象月</p>
                <p className="font-medium">
                  {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleCalculatePayroll}
                disabled={isCalculating}
                className="gap-2"
              >
                <Calculator className="h-4 w-4" />
                {isCalculating ? '計算中...' : '給与を計算'}
              </Button>
              <Button
                onClick={handleSaveAll}
                variant="outline"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                すべて保存
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 給与一覧テーブル */}
      <Card>
        <CardHeader>
          <CardTitle>給与明細一覧</CardTitle>
          <CardDescription>
            スタッフごとの給与計算結果を表示・編集できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>スタッフ名</TableHead>
                  <TableHead className="text-right">出勤日数</TableHead>
                  <TableHead className="text-right">勤務時間</TableHead>
                  <TableHead className="text-right">残業</TableHead>
                  <TableHead className="text-right">基本給</TableHead>
                  <TableHead className="text-right">手当合計</TableHead>
                  <TableHead className="text-right">控除合計</TableHead>
                  <TableHead className="text-right">総支給額</TableHead>
                  <TableHead className="text-right">差引支給額</TableHead>
                  <TableHead className="text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollList.map((payroll) => (
                  <TableRow key={payroll.staffId}>
                    <TableCell className="font-medium">{payroll.staffName}</TableCell>
                    <TableCell className="text-right">
                      {payroll.workDays}日
                    </TableCell>
                    <TableCell className="text-right">
                      {payroll.totalWorkHours}h
                    </TableCell>
                    <TableCell className="text-right">
                      {payroll.overtimeHours}h
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payroll.baseSalary)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      +{formatCurrency(
                        payroll.overtimePay + 
                        payroll.allowancesTotal
                      )}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      -{formatCurrency(payroll.deductionsTotal)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payroll.grossPay)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {formatCurrency(payroll.netPay)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedStaff(payroll)}
                          title="詳細を表示"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSavePayroll(payroll)}
                          disabled={payroll.grossPay === 0}
                          title="保存"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {payrollList.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              スタッフが登録されていません
            </div>
          )}
        </CardContent>
      </Card>

      {/* 給与詳細編集ダイアログ */}
      {selectedStaff && (
        <Dialog open={!!selectedStaff} onOpenChange={() => setSelectedStaff(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                給与明細詳細 - {selectedStaff.staffName}
              </DialogTitle>
              <DialogDescription>
                {selectedStaff.month} の給与明細を編集できます
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* 給与内訳 */}
              <div>
                <h4 className="font-medium mb-3">給与内訳</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm">基本給{selectedStaff.hourlyRate ? `（時給 ¥${selectedStaff.hourlyRate}）` : ''}</span>
                    <span className="font-medium">{formatCurrency(selectedStaff.baseSalary)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm">残業手当</span>
                    <span className="font-medium text-green-600">+{formatCurrency(selectedStaff.overtimePay)}</span>
                  </div>
                  {selectedStaff.allowances.map((allowance, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b">
                      <span className="text-sm">{allowance.name}（手当）</span>
                      <span className="font-medium text-green-600">+{formatCurrency(allowance.amount)}</span>
                    </div>
                  ))}
                  {selectedStaff.deductions.map((deduction, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b">
                      <span className="text-sm">{deduction.name}（控除）</span>
                      <span className="font-medium text-red-600">-{formatCurrency(deduction.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 勤務時間詳細 */}
              <div>
                <h4 className="font-medium mb-3">勤務詳細</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">出勤日数</Label>
                    <div className="font-medium">{selectedStaff.workDays}日</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">通常勤務時間</Label>
                    <div className="font-medium">{selectedStaff.regularHours}h</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">残業時間</Label>
                    <div className="font-medium">{selectedStaff.overtimeHours}h</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">総勤務時間</Label>
                    <div className="font-medium text-primary">{selectedStaff.totalWorkHours}h</div>
                  </div>
                </div>
              </div>

              {/* 合計 */}
              <div className="space-y-2 pt-4 border-t-2">
                <div className="flex justify-between py-2">
                  <span className="font-medium">総支給額</span>
                  <span className="font-medium text-lg">{formatCurrency(selectedStaff.grossPay)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="font-medium text-red-600">控除合計</span>
                  <span className="font-medium text-red-600">-{formatCurrency(selectedStaff.deductionsTotal)}</span>
                </div>
                <div className="flex justify-between py-3 border-t-2">
                  <span className="font-medium text-lg">差引支給額</span>
                  <span className="font-medium text-xl text-primary">{formatCurrency(selectedStaff.netPay)}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedStaff(null)}>
                閉じる
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* カスタム項目追加ダイアログ */}
      <Dialog open={showCustomItemDialog} onOpenChange={setShowCustomItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>カスタム項目を追加</DialogTitle>
            <DialogDescription>
              手当や控除などの独自項目を追加できます
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">項目名</Label>
              <Input
                id="item-name"
                placeholder="例：交通費、資格手当、社会保険"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-amount">金額</Label>
              <Input
                id="item-amount"
                type="number"
                placeholder="例：5000"
                value={customItemAmount}
                onChange={(e) => setCustomItemAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-type">種類</Label>
              <Select
                value={customItemType}
                onValueChange={(value: 'allowance' | 'deduction') => setCustomItemType(value)}
              >
                <SelectTrigger id="item-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allowance">手当（加算）</SelectItem>
                  <SelectItem value="deduction">控除（減算）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomItemDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleAddCustomItem}>
              <Plus className="h-4 w-4 mr-2" />
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}