import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Settings, Save, Clock, DollarSign, AlertCircle, Moon, Calendar } from 'lucide-react';
import { systemSettingsApi, SystemSettings, DEFAULT_SYSTEM_SETTINGS } from '../utils/api';
import { toast } from 'sonner@2.0.3';

export function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    const data = await systemSettingsApi.get();
    setSettings(data);
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await systemSettingsApi.save(settings);
    
    if (success) {
      toast.success('システム設定を保存しました', {
        description: '設定内容が反映されました。'
      });
    } else {
      toast.error('保存に失敗しました', {
        description: 'もう一度お試しください。'
      });
    }
    
    setIsSaving(false);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SYSTEM_SETTINGS);
    toast.info('デフォルト値に戻しました', {
      description: '保存ボタンをクリックして確定してください。'
    });
  };

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
          <Settings className="h-6 w-6" />
          システム設定
        </h2>
        <p className="text-muted-foreground">
          給与計算や勤怠管理に使用する基準値を設定します
        </p>
      </div>

      {/* 警告 */}
      <Alert className="border-orange-200 bg-orange-50">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-900">
          <strong>重要:</strong> これらの設定は全スタッフの給与計算に影響します。変更する際は十分ご注意ください。
        </AlertDescription>
      </Alert>

      {/* 労働時間設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            労働時間設定
          </CardTitle>
          <CardDescription>
            法定労働時間と休憩時間に関する設定
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="regularHoursPerDay">法定労働時間（時間/日）</Label>
              <Input
                id="regularHoursPerDay"
                type="number"
                min="1"
                max="24"
                value={settings.regularHoursPerDay}
                onChange={(e) => updateSetting('regularHoursPerDay', Number(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                1日の標準労働時間。この時間を超えると残業となります。
              </p>
            </div>

            <div>
              <Label htmlFor="defaultBreakMinutes">デフォルト休憩時間（分）</Label>
              <Input
                id="defaultBreakMinutes"
                type="number"
                min="0"
                max="480"
                value={settings.defaultBreakMinutes}
                onChange={(e) => updateSetting('defaultBreakMinutes', Number(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                勤怠入力時の初期値として使用されます。
              </p>
            </div>

            <div>
              <Label htmlFor="breakMinutesFor6Hours">6時間超の法定休憩（分）</Label>
              <Input
                id="breakMinutesFor6Hours"
                type="number"
                min="0"
                max="120"
                value={settings.breakMinutesFor6Hours}
                onChange={(e) => updateSetting('breakMinutesFor6Hours', Number(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                労働基準法: 6時間を超える場合は45分以上
              </p>
            </div>

            <div>
              <Label htmlFor="breakMinutesFor8Hours">8時間超の法定休憩（分）</Label>
              <Input
                id="breakMinutesFor8Hours"
                type="number"
                min="0"
                max="120"
                value={settings.breakMinutesFor8Hours}
                onChange={(e) => updateSetting('breakMinutesFor8Hours', Number(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                労働基準法: 8時間を超える場合は60分以上
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 残業・割増設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            残業・割増設定
          </CardTitle>
          <CardDescription>
            残業時間の計算基準と割増率の設定
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="overtimeThreshold">月の残業時間閾値（時間）</Label>
              <Input
                id="overtimeThreshold"
                type="number"
                min="0"
                max="200"
                value={settings.overtimeThreshold}
                onChange={(e) => updateSetting('overtimeThreshold', Number(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                この時間を超えると超過残業として扱われます。（36協定: 通常45時間）
              </p>
            </div>

            <div>
              <Label htmlFor="overtimeRate">残業割増率（%）</Label>
              <Input
                id="overtimeRate"
                type="number"
                min="0"
                max="100"
                value={settings.overtimeRate}
                onChange={(e) => updateSetting('overtimeRate', Number(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                法定内残業の割増率（労働基準法: 25%以上）
              </p>
            </div>

            <div>
              <Label htmlFor="excessOvertimeRate">超過残業割増率（%）</Label>
              <Input
                id="excessOvertimeRate"
                type="number"
                min="0"
                max="100"
                value={settings.excessOvertimeRate}
                onChange={(e) => updateSetting('excessOvertimeRate', Number(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                月45時間超の残業の割増率（労働基準法: 50%以上推奨）
              </p>
            </div>

            <div>
              <Label htmlFor="lateNightRate">深夜割増率（%）</Label>
              <Input
                id="lateNightRate"
                type="number"
                min="0"
                max="100"
                value={settings.lateNightRate}
                onChange={(e) => updateSetting('lateNightRate', Number(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                深夜労働の割増率（労働基準法: 25%以上）
              </p>
            </div>

            <div>
              <Label htmlFor="holidayRate">休日割増率（%）</Label>
              <Input
                id="holidayRate"
                type="number"
                min="0"
                max="100"
                value={settings.holidayRate}
                onChange={(e) => updateSetting('holidayRate', Number(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                休日労働の割増率（労働基準法: 35%以上）
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Moon className="h-4 w-4" />
              深夜時間帯設定
            </h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="lateNightStartHour">深夜開始時刻（時）</Label>
                <Input
                  id="lateNightStartHour"
                  type="number"
                  min="0"
                  max="23"
                  value={settings.lateNightStartHour}
                  onChange={(e) => updateSetting('lateNightStartHour', Number(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  労働基準法: 22時から翌5時
                </p>
              </div>

              <div>
                <Label htmlFor="lateNightEndHour">深夜終了時刻（時）</Label>
                <Input
                  id="lateNightEndHour"
                  type="number"
                  min="0"
                  max="23"
                  value={settings.lateNightEndHour}
                  onChange={(e) => updateSetting('lateNightEndHour', Number(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  翌日の時刻を指定（5 = 翌5時）
                </p>
              </div>

              <div>
                <Label htmlFor="earlyOvertimeStandardHour">早出残業基準時間（時）</Label>
                <Input
                  id="earlyOvertimeStandardHour"
                  type="number"
                  min="0"
                  max="23"
                  value={settings.earlyOvertimeStandardHour}
                  onChange={(e) => updateSetting('earlyOvertimeStandardHour', Number(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  この時刻より前の出勤を早出残業として扱います（例: 9時）
                </p>
              </div>

              <div>
                <Label htmlFor="earlyLeaveStandardHour">早上基準時刻（時）</Label>
                <Input
                  id="earlyLeaveStandardHour"
                  type="number"
                  min="0"
                  max="23"
                  value={settings.earlyLeaveStandardHour}
                  onChange={(e) => updateSetting('earlyLeaveStandardHour', Number(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  この時刻より前の退勤を早上として扱います（例: 17時）
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 給与設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            給与設定
          </CardTitle>
          <CardDescription>
            給与計算に関する基本設定
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="defaultHourlyRate">デフォルト時給（円）</Label>
            <Input
              id="defaultHourlyRate"
              type="number"
              min="0"
              max="10000"
              value={settings.defaultHourlyRate}
              onChange={(e) => updateSetting('defaultHourlyRate', Number(e.target.value))}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              スタッフマスターで時給が未設定の場合に使用されます。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* アクションボタン */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? '保存中...' : '設定を保存'}
        </Button>
        <Button variant="outline" onClick={handleReset} disabled={isSaving}>
          デフォルトに戻す
        </Button>
      </div>

      {/* 説明 */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">💡 設定のヒント</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>労働基準法に準拠した値を設定してください</li>
            <li>設定変更は保存後すぐに全システムに反映されます</li>
            <li>給与計算済みのデータには影響しませんが、新規計算時に適用されます</li>
            <li>不明な点がある場合は社会保険労務士にご相談ください</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}