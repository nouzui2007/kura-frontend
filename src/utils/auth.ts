import { createClient } from './supabase/client';
import { profileApi } from './api';

// 本番環境のSupabase APIエンドポイント
const API_BASE_URL = 'https://etddfgnuwagrtgnvqcum.supabase.co/functions/v1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZGRmZ251d2FncnRnbnZxY3VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MTE0NjAsImV4cCI6MjA3NTk4NzQ2MH0.yv41fCSlGcuw09ynfJL9ZLz8hMKEGaKbn7qNNJCx7wo';

export type UserRole = 'system-admin' | 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
}

// サインアップ（サーバー経由）
export async function signUp(email: string, password: string, name: string, role: UserRole = 'user'): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ email, password, name, role }),
    });

    const result = await response.json();
    
    if (!result.success) {
      return { success: false, error: result.error || 'サインアップに失敗しました' };
    }

    return { success: true };
  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error: 'サインアップ中にエラーが発生しました' };
  }
}

// ログイン
export async function signIn(email: string, password: string): Promise<{ success: boolean; user?: User; accessToken?: string; error?: string }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return { success: false, error: error?.message || 'ログインに失敗しました' };
    }

    // profileApi.getProfile()を使ってusernameとroleを取得
    const profile = await profileApi.getProfile(data.user.id);
    
    const user: User = {
      id: data.user.id,
      email: data.user.email || '',
      name: profile?.username || '', // profileのusernameをnameにマッピング
      role: (profile?.role as UserRole) || 'user', // profileのroleをroleにマッピング
    };

    return {
      success: true,
      user,
      accessToken: data.session.access_token,
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: 'ログイン中にエラーが発生しました' };
  }
}

// ログアウト
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

// セッションチェック
export async function getSession(): Promise<{ user: User | null; accessToken: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Session error:', error);
      return { user: null, accessToken: null };
    }

    if (!data.session) {
      return { user: null, accessToken: null };
    }

    // profileApi.getProfile()を使ってusernameとroleを取得
    const profile = await profileApi.getProfile(data.session.user.id);
    
    const user: User = {
      id: data.session.user.id,
      email: data.session.user.email || '',
      name: profile?.username || '', // profileのusernameをnameにマッピング
      role: (profile?.role as UserRole) || 'user', // profileのroleをroleにマッピング
    };

    return {
      user,
      accessToken: data.session.access_token,
    };
  } catch (error) {
    console.error('Get session error:', error);
    return { user: null, accessToken: null };
  }
}