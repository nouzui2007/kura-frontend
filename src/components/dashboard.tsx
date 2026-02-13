import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Clock, 
  Users, 
  TrendingUp, 
  Calendar, 
  InfoIcon,
  CheckCircle2,
  ArrowRight,
  Shield,
  Calculator,
  Database
} from 'lucide-react';
import { Button } from './ui/button';
import { UserRole } from '../utils/auth';
import { sampleDataApi } from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface DashboardProps {
  userName: string;
  userRole: UserRole;
  onNavigate: (page: string) => void;
}

export function Dashboard({ userName, userRole, onNavigate }: DashboardProps) {
  const isAdmin = userRole === 'admin' || userRole === 'system-admin';

  return (
    <div className="space-y-6">
      {/* ウェルカムセクション */}
      <div>
        <h2 className="text-2xl mb-2">ようこそ、{userName}さん</h2>
        <p className="text-muted-foreground">
          ハウスクリニックくら 勤怠管理システムへようこそ。今日も一日お疲れ様です。
        </p>
      </div>

      {/* お知らせ */}
      <Alert className="border-blue-200 bg-blue-50">
        <InfoIcon className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>ハウスクリニックくら 勤怠管理システム</strong> - 
          勤怠データは自動保存されます。入力内容が即座にサーバーに保存されるため、手動保存は不要です。
        </AlertDescription>
      </Alert>

      {/* クイックアクションカード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate('attendance')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Clock className="h-8 w-8 text-primary" />
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4">勤怠入力</CardTitle>
            <CardDescription>
              スタッフの出勤・退勤時間を記録
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full">
              入力画面へ
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate('work-schedule')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Calendar className="h-8 w-8 text-primary" />
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4">勤務表</CardTitle>
            <CardDescription>
              月次の全スタッフ勤怠情報を確認
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full">
              勤務表を見る
            </Button>
          </CardContent>
        </Card>

        {isAdmin && (
          <>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate('staff')}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Users className="h-8 w-8 text-primary" />
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">スタッフ管理</CardTitle>
                <CardDescription>
                  従業員情報の登録・編集・削除
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full">
                  管理画面へ
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate('payroll')}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Calculator className="h-8 w-8 text-primary" />
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">給与計算</CardTitle>
                <CardDescription>
                  勤怠データから給与を自動計算
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full">
                  計算画面へ
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate('users')}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Shield className="h-8 w-8 text-primary" />
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">ユーザー管理</CardTitle>
                <CardDescription>
                  システムユーザーの管理と権限設定
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full">
                  管理画面へ
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* 使い方ガイド */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            システムの使い方
          </CardTitle>
          <CardDescription>
            勤怠管理システムを効果的に利用するためのガイド
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {isAdmin && (
              <>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">スタッフを登録する</h4>
                    <p className="text-sm text-muted-foreground">
                      「スタッフ管理」画面から従業員情報を登録します。氏名、部署、社員番号を入力できます。
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">ユーザーを管理する</h4>
                    <p className="text-sm text-muted-foreground">
                      「ユーザー管理」画面でシステムユーザーの権限を設定できます。管理者と一般ユーザーを切り替えられます。
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary">{isAdmin ? '3' : '1'}</span>
              </div>
              <div>
                <h4 className="font-medium mb-1">出勤スタッフを選択する</h4>
                <p className="text-sm text-muted-foreground">
                  「勤怠入力」画面で日付を選択し、その日に出勤するスタッフをチェックボックスで選びます。
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-primary">{isAdmin ? '4' : '2'}</span>
              </div>
              <div>
                <h4 className="font-medium mb-1">勤務時間を入力する</h4>
                <p className="text-sm text-muted-foreground">
                  アナログ時計風のタイムピッカーで開始時刻と終了時刻を入力します。時間と分を個別に設定でき、AM/PMも選択できます。
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium mb-1">自動保存</h4>
                <p className="text-sm text-muted-foreground">
                  入力したデータは自動的にSupabaseに保存されます。手動で保存ボタンを押す必要はありません。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 機能一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>主な機能</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium">直感的な時間入力</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  時計形式のUIで簡単に時間を選択
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium">日別管理</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  日付ナビゲーターで前後の日付を簡単に切り替え
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium">自動計算</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  勤務時間を自動で計算して表示
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium">データ永続化</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Supabaseによる安全なデータ保存
                </p>
              </div>
            </div>

            {isAdmin && (
              <>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium">スタッフマスター管理</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      従業員情報の一元管理
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium">ユーザー権限管理</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      管理者と一般ユーザーの権限設定
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}