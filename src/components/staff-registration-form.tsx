import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Staff } from '../utils/api';
import { Calendar, Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface StaffRegistrationFormProps {
  staff?: Staff;
  onSave: (staff: Staff) => Promise<void>;
  onCancel: () => void;
}

export function StaffRegistrationForm({ staff, onSave, onCancel }: StaffRegistrationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // 基本情報
  const [employeeId, setEmployeeId] = useState(staff?.employeeId || `EMP${Date.now().toString().slice(-6)}`);
  const [lastName, setLastName] = useState(staff?.lastName || '');
  const [firstName, setFirstName] = useState(staff?.firstName || '');
  const [lastNameKana, setLastNameKana] = useState(staff?.lastNameKana || '');
  const [firstNameKana, setFirstNameKana] = useState(staff?.firstNameKana || '');
  const [gender, setGender] = useState<string>(staff?.gender || '');
  const [birthDate, setBirthDate] = useState(staff?.birthDate || '');
  const [postalCode, setPostalCode] = useState(staff?.postalCode || '');
  const [address, setAddress] = useState(staff?.address || '');
  const [phone, setPhone] = useState(staff?.phone || '');
  const [email, setEmail] = useState(staff?.email || '');
  
  // 雇用情報
  const [employmentType, setEmploymentType] = useState<string>(staff?.employmentType || '');
  const [department, setDepartment] = useState(staff?.department || '');
  const [hireDate, setHireDate] = useState(staff?.hireDate || '');
  const [retireDate, setRetireDate] = useState(staff?.retireDate || '');
  const [workType, setWorkType] = useState<string>(staff?.workType || '');
  const [workLocation, setWorkLocation] = useState(staff?.workLocation || '');
  
  // 給与情報
  const [monthlySalary, setMonthlySalary] = useState(staff?.monthlySalary?.toString() || '');
  const [hourlyRate, setHourlyRate] = useState(staff?.hourlyRate?.toString() || '');
  const [allowances, setAllowances] = useState(staff?.allowances || []);
  const [deductions, setDeductions] = useState(staff?.deductions || []);
  const [bankName, setBankName] = useState(staff?.bankName || '');
  const [branchName, setBranchName] = useState(staff?.branchName || '');
  const [accountType, setAccountType] = useState<string>(staff?.accountType || '');
  const [accountNumber, setAccountNumber] = useState(staff?.accountNumber || '');

  // 手当追加
  const addAllowance = () => {
    setAllowances([...allowances, { name: '', amount: 0 }]);
  };

  // 手当削除
  const removeAllowance = (index: number) => {
    setAllowances(allowances.filter((_, i) => i !== index));
  };

  // 手当更新
  const updateAllowance = (index: number, field: 'name' | 'amount', value: string | number) => {
    const updated = [...allowances];
    updated[index] = { ...updated[index], [field]: value };
    setAllowances(updated);
  };

  // 控除追加
  const addDeduction = () => {
    setDeductions([...deductions, { name: '', amount: 0 }]);
  };

  // 控除削除
  const removeDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  // 控除更新
  const updateDeduction = (index: number, field: 'name' | 'amount', value: string | number) => {
    const updated = [...deductions];
    updated[index] = { ...updated[index], [field]: value };
    setDeductions(updated);
  };

  // 郵便番号から住所検索（簡易版）
  const searchAddress = async () => {
    if (!postalCode || postalCode.length < 7) {
      toast.error('郵便番号を正しく入力してください');
      return;
    }
    
    try {
      // 実際の実装では郵便番号APIを使用
      toast.info('郵便番号検索機能は開発中です');
    } catch (error) {
      toast.error('住所検索に失敗しました');
    }
  };

  // 保存処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!lastName || !firstName) {
      toast.error('氏名は必須項目です');
      return;
    }
    
    if (!department) {
      toast.error('所属部署は必須項目です');
      return;
    }

    setIsLoading(true);
    
    try {
      const staffData: Staff = {
        id: staff?.id || `staff_${Date.now()}`,
        employeeId,
        lastName,
        firstName,
        lastNameKana,
        firstNameKana,
        gender: gender as any,
        birthDate,
        postalCode,
        address,
        phone,
        email,
        employmentType: employmentType as any,
        department,
        hireDate,
        retireDate,
        workType: workType as any,
        workLocation,
        monthlySalary: monthlySalary ? parseInt(monthlySalary) : undefined,
        hourlyRate: hourlyRate ? parseInt(hourlyRate) : undefined,
        allowances: allowances.filter(a => a.name && a.amount),
        deductions: deductions.filter(d => d.name && d.amount),
        bankName,
        branchName,
        accountType: accountType as any,
        accountNumber,
        name: `${lastName} ${firstName}`, // 統合フィールド
      };
      
      await onSave(staffData);
      toast.success(staff ? 'スタッフ情報を更新しました' : 'スタッフを登録しました');
    } catch (error) {
      console.error('Error saving staff:', error);
      toast.error('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl flex items-center gap-2">
            {staff ? 'スタッフ情報の編集' : '新規スタッフ登録'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            従業員の詳細情報を入力してください
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            一覧へ戻る
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {/* A. 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
          <CardDescription>従業員の基本的な個人情報を入力してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">従業員ID *</Label>
              <Input
                id="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="EMP001"
                required
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lastName">姓 *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="山田"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">名 *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="太郎"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lastNameKana">セイ</Label>
              <Input
                id="lastNameKana"
                value={lastNameKana}
                onChange={(e) => setLastNameKana(e.target.value)}
                placeholder="ヤマダ"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstNameKana">メイ</Label>
              <Input
                id="firstNameKana"
                value={firstNameKana}
                onChange={(e) => setFirstNameKana(e.target.value)}
                placeholder="タロウ"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gender">性別</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="gender">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">生年月日</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode">郵便番号</Label>
              <div className="flex gap-2">
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="123-4567"
                />
                <Button type="button" variant="outline" size="sm" onClick={searchAddress}>
                  検索
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">住所</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="東京都渋谷区..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">電話番号</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="090-1234-5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@example.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* B. 雇用情報 */}
      <Card>
        <CardHeader>
          <CardTitle>雇用情報</CardTitle>
          <CardDescription>雇用形態や所属に関する情報を入力してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employmentType">雇用形態</Label>
              <Select value={employmentType} onValueChange={setEmploymentType}>
                <SelectTrigger id="employmentType">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">正社員</SelectItem>
                  <SelectItem value="contract">契約社員</SelectItem>
                  <SelectItem value="part-time">パート</SelectItem>
                  <SelectItem value="temporary">アルバイト</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">所属部署 *</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="営業部"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hireDate">入社日</Label>
              <Input
                id="hireDate"
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retireDate">退社日</Label>
              <Input
                id="retireDate"
                type="date"
                value={retireDate}
                onChange={(e) => setRetireDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workType">勤務区分</Label>
              <Select value={workType} onValueChange={setWorkType}>
                <SelectTrigger id="workType">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">常勤</SelectItem>
                  <SelectItem value="irregular">非常勤</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workLocation">勤務地</Label>
              <Input
                id="workLocation"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
                placeholder="東京本社"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* C. 給与情報 */}
      <Card>
        <CardHeader>
          <CardTitle>給与情報</CardTitle>
          <CardDescription>給与・手当・控除・口座情報を入力してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlySalary">基本給（月額）</Label>
              <Input
                id="monthlySalary"
                type="number"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                placeholder="250000"
              />
              <p className="text-xs text-muted-foreground">※月給制の場合に入力</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">時給</Label>
              <Input
                id="hourlyRate"
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="1200"
              />
              <p className="text-xs text-muted-foreground">※時給制の場合に入力</p>
            </div>
          </div>

          <Separator />

          {/* 手当 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>各種手当</Label>
              <Button type="button" variant="outline" size="sm" onClick={addAllowance}>
                <Plus className="h-4 w-4 mr-1" />
                追加
              </Button>
            </div>
            <div className="space-y-2">
              {allowances.map((allowance, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="手当名（例：交通費）"
                    value={allowance.name}
                    onChange={(e) => updateAllowance(index, 'name', e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="金額"
                    value={allowance.amount || ''}
                    onChange={(e) => updateAllowance(index, 'amount', parseInt(e.target.value) || 0)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAllowance(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* 控除 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>控除項目</Label>
              <Button type="button" variant="outline" size="sm" onClick={addDeduction}>
                <Plus className="h-4 w-4 mr-1" />
                追加
              </Button>
            </div>
            <div className="space-y-2">
              {deductions.map((deduction, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="控除名（例：社会保険）"
                    value={deduction.name}
                    onChange={(e) => updateDeduction(index, 'name', e.target.value)}
                    />
                  <Input
                    type="number"
                    placeholder="金額"
                    value={deduction.amount || ''}
                    onChange={(e) => updateDeduction(index, 'amount', parseInt(e.target.value) || 0)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDeduction(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* 銀行口座 */}
          <div className="space-y-4">
            <Label>銀行口座情報</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">銀行名</Label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="○○銀行"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchName">支店名</Label>
                <Input
                  id="branchName"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="○○支店"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountType">口座種別</Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger id="accountType">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">普通</SelectItem>
                    <SelectItem value="savings">当座</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">口座番号</Label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="1234567"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* フッターボタン */}
      <div className="flex justify-end gap-2 sticky bottom-4 bg-background p-4 border rounded-lg shadow-lg">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          キャンセル
        </Button>
        <Button type="submit" disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? '保存中...' : staff ? '更新' : '登録'}
        </Button>
      </div>
    </form>
  );
}
