import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Heart, AlertCircle, Play, Shield, User, Settings } from 'lucide-react';
import { UserRole } from '../utils/auth';

// デモアカウントの認証情報
export const DEMO_CREDENTIALS = {
  'system-admin': {
    email: 'sysadmin@hc-kura.jp',
    password: 'sysadmin123456',
    name: 'システム管理者',
    role: 'system-admin' as UserRole,
  },
  admin: {
    email: 'admin@hc-kura.jp',
    password: 'admin123456',
    name: 'クリニック管理者',
    role: 'admin' as UserRole,
  },
  user: {
    email: 'user@hc-kura.jp',
    password: 'user123456',
    name: 'スタッフ',
    role: 'user' as UserRole,
  },
};

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  onDemoLogin: (role: UserRole) => Promise<void>;
  error: string | null;
  isLoading: boolean;
}

export function Login({ onLogin, onSignUp, onDemoLogin, error, isLoading }: LoginProps) {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('user');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUpMode) {
      await onSignUp(email, password, name, role);
    } else {
      await onLogin(email, password);
    }
  };

  const handleDemoLogin = async (demoRole: UserRole) => {
    await onDemoLogin(demoRole);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-4 shadow-lg">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl text-foreground mb-2">ハウスクリニックくら</h1>
          <p className="text-muted-foreground">
            勤怠管理システム
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isSignUpMode ? '新規登録' : 'ログイン'}</CardTitle>
            <CardDescription>
              {isSignUpMode
                ? 'アカウントを作成して勤怠管理を始めましょう'
                : 'アカウントにログインしてください'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUpMode && (
                <div className="space-y-2">
                  <Label htmlFor="name">氏名</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="山田 太郎"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                />
              </div>

              {isSignUpMode && (
                <div className="space-y-3">
                  <Label>ユーザー種別</Label>
                  <RadioGroup value={role} onValueChange={(value) => setRole(value as UserRole)}>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="user" id="role-user" />
                      <Label htmlFor="role-user" className="flex items-center gap-2 cursor-pointer flex-1">
                        <User className="h-4 w-4" />
                        <div>
                          <div>一般ユーザー</div>
                          <div className="text-xs text-muted-foreground">勤怠入力のみ可能</div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="admin" id="role-admin" />
                      <Label htmlFor="role-admin" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Shield className="h-4 w-4" />
                        <div>
                          <div>管理者</div>
                          <div className="text-xs text-muted-foreground">すべての機能が利用可能</div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="system-admin" id="role-system-admin" />
                      <Label htmlFor="role-system-admin" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Settings className="h-4 w-4" />
                        <div>
                          <div>システム管理者</div>
                          <div className="text-xs text-muted-foreground">システム設定を含む全機能が利用可能</div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                />
                {isSignUpMode && (
                  <p className="text-xs text-muted-foreground">
                    6文字以上で入力してください
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '処理中...' : isSignUpMode ? '登録' : 'ログイン'}
              </Button>

              {!isSignUpMode && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        または
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => handleDemoLogin('system-admin')}
                      disabled={isLoading}
                    >
                      <Shield className="h-4 w-4 text-purple-600" />
                      システム管理者デモでログイン
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => handleDemoLogin('admin')}
                      disabled={isLoading}
                    >
                      <Shield className="h-4 w-4" />
                      管理者デモでログイン
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => handleDemoLogin('user')}
                      disabled={isLoading}
                    >
                      <User className="h-4 w-4" />
                      一般ユーザーデモでログイン
                    </Button>
                  </div>

                  <div className="text-xs text-center text-muted-foreground bg-blue-50 p-3 rounded-lg">
                    <p className="font-medium text-blue-900 mb-1">💡 デモアカウントについて</p>
                    <p className="text-blue-700">
                      システム管理者はシステム設定を含む全機能、管理者は全機能、一般ユーザーは勤怠入力のみ利用できます
                    </p>
                  </div>
                </>
              )}

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUpMode(!isSignUpMode);
                    setEmail('');
                    setPassword('');
                    setName('');
                    setRole('user');
                  }}
                  className="text-primary hover:underline"
                >
                  {isSignUpMode
                    ? 'すでにアカウントをお持ちの方はこちら'
                    : 'アカウントをお持ちでない方はこちら'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground mt-6">
          © 2024 勤怠管理システム. All rights reserved.
        </div>
      </div>
    </div>
  );
}
