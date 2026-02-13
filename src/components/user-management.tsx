import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Shield, User, AlertCircle, Loader2, Settings, RefreshCw, Check, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { profileApi, UserProfile, RoleOption } from '../utils/api';

interface UserWithRole {
  id: string;
  uid: string;
  email: string;
  username: string; // profile.username (profileがnullの時は空欄)
  role: string; // profile.role (profileがnullの時は'user')
  hasProfile: boolean; // profileが存在するかどうか
}

interface UserManagementProps {
  accessToken: string;
  currentUserId: string;
}

export function UserManagement({ accessToken, currentUserId }: UserManagementProps) {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState<string>('');

  // /profile APIからユーザー一覧を取得
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // /profile APIからユーザー一覧を取得
      const userProfiles = await profileApi.getUsers();
      
      // UserProfile[] を UserWithRole[] に変換
      const usersWithRoles: UserWithRole[] = userProfiles.map((profile) => ({
        id: profile.id,
        uid: profile.uid,
        email: profile.email,
        username: profile.username || '',
        role: profile.role || 'user',
        hasProfile: profile.has_role,
      }));

      setUsers(usersWithRoles);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('ユーザー一覧の取得中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 権限一覧を取得
  const fetchRoles = async () => {
    const roleOptions = await profileApi.getRoles();
    setRoles(roleOptions);
  };

  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, []);

  // 役割を変更
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // ユーザー情報を取得してprofileの有無を確認
      const user = users.find(u => u.uid === userId);
      if (!user) {
        toast.error('ユーザーが見つかりません');
        return;
      }

      let success: boolean;
      
      // profileが存在しない場合は作成、存在する場合は更新
      if (!user.hasProfile) {
        success = await profileApi.createProfile(userId, null, newRole);
        if (success) {
          toast.success('権限を設定しました');
        } else {
          toast.error('権限の設定に失敗しました');
        }
      } else {
        success = await profileApi.updateRole(userId, newRole);
        if (success) {
          toast.success('権限を変更しました');
        } else {
          toast.error('権限の変更に失敗しました');
        }
      }
      
      if (success) {
        fetchUsers(); // リスト更新
      }
    } catch (err) {
      console.error('Error changing role:', err);
      toast.error('権限の変更中にエラーが発生しました');
    }
  };

  // ユーザー名の編集を開始
  const handleStartEditUsername = (userId: string, currentUsername: string) => {
    setEditingUserId(userId);
    setEditingUsername(currentUsername);
  };

  // ユーザー名の編集をキャンセル
  const handleCancelEditUsername = () => {
    setEditingUserId(null);
    setEditingUsername('');
  };

  // ユーザー名を保存
  const handleSaveUsername = async (userId: string, profileId?: string) => {
    try {
      let success;
      if (profileId) {
        success = await profileApi.updateUsername(profileId, editingUsername);      
      } else {
        success = await profileApi.createProfile(userId, editingUsername);              
      }
      if (success) {
        toast.success('ユーザー名を更新しました');
        setEditingUserId(null);
        setEditingUsername('');
        fetchUsers(); // リスト更新
      } else {
        toast.error('ユーザー名の更新に失敗しました');
      }
    } catch (err) {
      console.error('Error updating username:', err);
      toast.error('ユーザー名の更新中にエラーが発生しました');
    }
  };

  // 権限に対応するバッジの色を取得
  const getRoleBadgeVariant = (role: string) => {
    if (role === 'system-admin') return 'default';
    if (role === 'admin') return 'default';
    return 'secondary';
  };

  // 権限に対応するアイコンとラベルを取得
  const getRoleDisplay = (role: string) => {
    const roleOption = roles.find(r => r.value === role);
    if (role === 'system-admin') {
      return { icon: Settings, label: roleOption?.label || 'システム管理者' };
    }
    if (role === 'admin') {
      return { icon: Shield, label: roleOption?.label || '管理者' };
    }
    return { icon: User, label: roleOption?.label || '一般' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl mb-2">ユーザー管理</h2>
          <p className="text-muted-foreground">
            システムユーザーの権限を管理できます
          </p>
        </div>
        <Button onClick={fetchUsers} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          更新
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>ユーザー一覧</CardTitle>
          <CardDescription>
            登録されているユーザーとその権限を管理できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ユーザー名</TableHead>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>権限</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      ユーザーが登録されていません
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const roleDisplay = getRoleDisplay(user.role);
                    const RoleIcon = roleDisplay.icon;
                    const emailDisplay = user.email || 'メールアドレス未設定';
                    const emailInitial = user.email ? user.email.charAt(0).toUpperCase() : '?';
                    // usernameを優先的に表示、なければemailのローカル部分、それもなければ「ユーザー」
                    const displayName = user.username || (user.email ? user.email.split('@')[0] : 'ユーザー');
                    
                    return (
                      <TableRow key={user.uid}>
                        <TableCell>
                          {editingUserId === user.uid ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingUsername}
                                onChange={(e) => setEditingUsername(e.target.value)}
                                className="h-8"
                                placeholder="ユーザー名を入力"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveUsername(user.uid, user.id);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEditUsername();
                                  }
                                }}
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSaveUsername(user.uid, user.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEditUsername}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-primary text-sm">
                                  {emailInitial}
                                </span>
                              </div>
                              <div
                                className="flex-1 cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors"
                                onClick={() => handleStartEditUsername(user.uid, user.username)}
                              >
                                <div className="font-medium">{displayName}</div>
                                {user.uid === currentUserId && (
                                  <span className="text-xs text-muted-foreground">(あなた)</span>
                                )}
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{emailDisplay}</TableCell>
                        <TableCell>
                          {user.id === currentUserId ? (
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              <RoleIcon className="h-3 w-3 mr-1" />
                              {roleDisplay.label}
                            </Badge>
                          ) : (
                            <Select
                              value={user.role}
                              onValueChange={(value) => handleRoleChange(user.uid, value)}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {roles.map((role) => {
                                  const display = getRoleDisplay(role.value);
                                  const Icon = display.icon;
                                  return (
                                    <SelectItem key={role.value} value={role.value}>
                                      <div className="flex items-center gap-2">
                                        <Icon className="h-3 w-3" />
                                        {role.label}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground space-y-2">
            <p>💡 <strong>権限について:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>システム管理者:</strong> すべての機能にアクセスでき、システム設定の変更が可能です</li>
              <li><strong>管理者:</strong> スタッフ管理、勤怠管理、給与計算が可能です</li>
              <li><strong>一般:</strong> 勤怠入力のみ利用できます</li>
            </ul>
            <p className="text-amber-600 mt-3">⚠️ 自分自身の権限変更はできません</p>
            <p className="text-blue-600 mt-2">ℹ️ 新規ユーザーの登録はSupabase Authenticationで行います。権限情報がないユーザーには自動的に「一般」権限が割り当てられます。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}