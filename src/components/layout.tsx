import { ReactNode } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { 
  Home, 
  Clock, 
  Users, 
  LogOut,
  Menu,
  X,
  Shield,
  User,
  Heart,
  Calculator,
  Settings,
  Terminal,
  Trash2,
  Calendar
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { UserRole } from '../utils/auth';

interface LayoutProps {
  children: ReactNode;
  userName: string;
  userRole: UserRole;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function Layout({ children, userName, userRole, currentPage, onNavigate, onLogout }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const allMenuItems = [
    { id: 'dashboard', label: 'ダッシュボード', icon: Home, roles: ['system-admin', 'admin', 'user'] },
    { id: 'attendance', label: '勤怠入力', icon: Clock, roles: ['system-admin', 'admin', 'user'] },
    { id: 'work-schedule', label: '勤務表', icon: Calendar, roles: ['system-admin', 'admin', 'user'] },
    { id: 'staff', label: 'スタッフ管理', icon: Users, roles: ['system-admin', 'admin'] },
    { id: 'payroll', label: '給与計算', icon: Calculator, roles: ['system-admin', 'admin'] },
    { id: 'users', label: 'ユーザー管理', icon: Shield, roles: ['system-admin', 'admin'] },
    { id: 'settings', label: 'システム設定', icon: Settings, roles: ['system-admin'] },
  ];

  // 役割に応じてメニューをフィルタリング
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-medium text-foreground">ハウスクリニックくら</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  勤怠管理システム
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary">{userName.charAt(0)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-foreground">{userName}</span>
                    <Badge 
                      variant={userRole === 'system-admin' || userRole === 'admin' ? 'default' : 'secondary'} 
                      className="w-fit text-xs px-1.5 py-0"
                    >
                      {userRole === 'system-admin' ? (
                        <><Settings className="h-3 w-3 mr-1" />システム管理者</>
                      ) : userRole === 'admin' ? (
                        <><Shield className="h-3 w-3 mr-1" />管理者</>
                      ) : (
                        <><User className="h-3 w-3 mr-1" />一般</>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="hidden md:flex gap-2"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* モバイルメニュー */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 py-3 space-y-1">
              <div className="flex items-center gap-2 text-sm mb-3 pb-3 border-b">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary">{userName.charAt(0)}</span>
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-foreground">{userName}</span>
                  <Badge 
                    variant={userRole === 'system-admin' || userRole === 'admin' ? 'default' : 'secondary'} 
                    className="w-fit text-xs px-1.5 py-0 mt-1"
                  >
                    {userRole === 'system-admin' ? (
                      <><Settings className="h-3 w-3 mr-1" />システム管理者</>
                    ) : userRole === 'admin' ? (
                      <><Shield className="h-3 w-3 mr-1" />管理者</>
                    ) : (
                      <><User className="h-3 w-3 mr-1" />一般</>
                    )}
                  </Badge>
                </div>
              </div>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      currentPage === item.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
              <button
                onClick={() => {
                  onLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="flex">
        {/* サイドバー（デスクトップのみ） */}
        <aside className="hidden md:block w-64 border-r bg-white min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                    currentPage === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}