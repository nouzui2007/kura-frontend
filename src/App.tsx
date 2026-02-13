import { useState, useEffect } from "react";
import { Login, DEMO_CREDENTIALS } from "./components/login";
import { Layout } from "./components/layout";
import { Dashboard } from "./components/dashboard";
import { AttendancePage } from "./components/attendance-page";
import { StaffPage } from "./components/staff-page";
import { PayrollPage } from "./components/payroll-page";
import { UserManagement } from "./components/user-management";
import { SystemSettingsPage } from "./components/system-settings-page";
import { WorkSchedulePage } from "./components/work-schedule-page";
import {
  signIn,
  signUp,
  signOut,
  getSession,
  User,
  UserRole,
} from "./utils/auth";
import { createClient } from "./utils/supabase/client";
import { profileApi } from "./utils/api";
import { toast } from "sonner@2.0.3";
import { Toaster } from "./components/ui/sonner";
import { Shield } from "lucide-react";

type Page =
  | "dashboard"
  | "attendance"
  | "work-schedule"
  | "staff"
  | "payroll"
  | "users"
  | "settings";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    null,
  );
  const [currentPage, setCurrentPage] =
    useState<Page>("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(
    null,
  );
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // ページタイトル設定
  useEffect(() => {
    document.title = "ハウスクリニックくら 勤怠管理システム";
  }, []);

  // セッションチェック
  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      const session = await getSession();
      setUser(session.user);
      setAccessToken(session.accessToken);
      setIsLoading(false);
    };
    checkSession();
  }, []);

  // 認証状態の変化を監視
  useEffect(() => {
    const supabase = createClient();

    // 認証状態の変化をリスニング
    const { data: authListener } =
      supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log("Auth state changed:", event);

          if (event === "TOKEN_REFRESHED") {
            console.log("Token refreshed successfully");
            if (session) {
              // profileApi.getProfile()を使ってusernameとroleを取得
              const profile = await profileApi.getProfile(session.user.id);
              
              const user: User = {
                id: session.user.id,
                email: session.user.email || "",
                name: profile?.username || "", // profileのusernameをnameにマッピング
                role: (profile?.role as UserRole) || "user", // profileのroleをroleにマッピング
              };
              setUser(user);
              setAccessToken(session.access_token);
            }
          } else if (event === "SIGNED_OUT") {
            setUser(null);
            setAccessToken(null);
          } else if (event === "USER_UPDATED" && session) {
            // profileApi.getProfile()を使ってusernameとroleを取得
            const profile = await profileApi.getProfile(session.user.id);
            
            const user: User = {
              id: session.user.id,
              email: session.user.email || "",
              name: profile?.username || "", // profileのusernameをnameにマッピング
              role: (profile?.role as UserRole) || "user", // profileのroleをroleにマッピング
            };
            setUser(user);
            setAccessToken(session.access_token);
          }
        },
      );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // ログイン処理
  const handleLogin = async (
    email: string,
    password: string,
  ) => {
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      const result = await signIn(email, password);

      if (result.success && result.user && result.accessToken) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        toast.success("ログインしました");
      } else {
        setAuthError(result.error || "ログインに失敗しました");
        toast.error(result.error || "ログインに失敗しました");
      }
    } catch (error) {
      setAuthError("ログイン中にエラーが発生しました");
      toast.error("ログイン中にエラーが発生しました");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // サインアップ処理
  const handleSignUp = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ) => {
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      const result = await signUp(email, password, name, role);

      if (result.success) {
        toast.success(
          "アカウントを作成しました。ログインしてください。",
        );
        // サインアップ成功後、自動的にログイン
        await handleLogin(email, password);
      } else {
        setAuthError(
          result.error || "サインアップに失敗しました",
        );
        toast.error(
          result.error || "サインアップに失敗しました",
        );
      }
    } catch (error) {
      setAuthError("サインアップ中にエラーが発生しました");
      toast.error("サインアップ中にエラーが発生しました");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // デモログイン処理
  const handleDemoLogin = async (role: UserRole) => {
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      const credentials =
        role === "system-admin"
          ? DEMO_CREDENTIALS["system-admin"]
          : role === "admin"
            ? DEMO_CREDENTIALS.admin
            : DEMO_CREDENTIALS.user;

      // まずログインを試みる
      const loginResult = await signIn(
        credentials.email,
        credentials.password,
      );

      if (
        loginResult.success &&
        loginResult.user &&
        loginResult.accessToken
      ) {
        setUser(loginResult.user);
        setAccessToken(loginResult.accessToken);
        const roleLabel =
          loginResult.user.role === "system-admin"
            ? "システム管理者"
            : role === "admin"
              ? "管理者"
              : "一般ユーザー";
        toast.success(`${roleLabel}デモでログインしました`);
      } else {
        // ログインに失敗した場合、デモアカウントを作成してから再ログイン
        const signUpResult = await signUp(
          credentials.email,
          credentials.password,
          credentials.name,
          credentials.role,
        );

        if (signUpResult.success) {
          // アカウント作成成功後、再度ログイン
          await handleLogin(
            credentials.email,
            credentials.password,
          );
        } else {
          setAuthError("デモアカウントの作成に失敗しました");
          toast.error("デモアカウントの作成に失敗しました");
        }
      }
    } catch (error) {
      setAuthError("デモログイン中にエラーが発生しました");
      toast.error("デモログイン中にエラーが発生しました");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setAccessToken(null);
    setCurrentPage("dashboard");
    toast.success("ログアウトしました");
  };

  // ページナビゲーション
  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  // 初期ロード中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            読み込み中...
          </p>
        </div>
      </div>
    );
  }

  // 未ログイン状態
  if (!user) {
    return (
      <>
        <Login
          onLogin={handleLogin}
          onSignUp={handleSignUp}
          onDemoLogin={handleDemoLogin}
          error={authError}
          isLoading={isAuthLoading}
        />
        <Toaster />
      </>
    );
  }

  // ログイン済み状態
  return (
    <>
      <Layout
        userName={user.name || user.email}
        userRole={user.role}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      >
        {currentPage === "dashboard" && (
          <Dashboard
            userName={user.name || user.email}
            userRole={user.role}
            onNavigate={handleNavigate}
          />
        )}
        {currentPage === "attendance" && (
          <AttendancePage userRole={user.role} />
        )}
        {currentPage === "work-schedule" && (
          <WorkSchedulePage />
        )}
        {currentPage === "staff" &&
        (user.role === "system-admin" ||
          user.role === "admin") ? (
          <StaffPage />
        ) : currentPage === "staff" ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl mb-2">
                アクセス権限がありません
              </h2>
              <p className="text-muted-foreground">
                このページは管理者のみアクセスできます
              </p>
            </div>
          </div>
        ) : null}
        {currentPage === "payroll" &&
        (user.role === "system-admin" ||
          user.role === "admin") ? (
          <PayrollPage />
        ) : currentPage === "payroll" ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl mb-2">
                アクセス権限がありません
              </h2>
              <p className="text-muted-foreground">
                このページは管理者のみアクセスできます
              </p>
            </div>
          </div>
        ) : null}
        {currentPage === "users" &&
        (user.role === "system-admin" ||
          user.role === "admin") ? (
          <UserManagement
            accessToken={accessToken!}
            currentUserId={user.id}
          />
        ) : currentPage === "users" ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl mb-2">
                アクセス権限がありません
              </h2>
              <p className="text-muted-foreground">
                このページは管理者のみアクセスできます
              </p>
            </div>
          </div>
        ) : null}
        {currentPage === "settings" &&
        user.role === "system-admin" ? (
          <SystemSettingsPage />
        ) : currentPage === "settings" ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl mb-2">
                アクセス権限がありません
              </h2>
              <p className="text-muted-foreground">
                このページはシステム管理者のみアクセスできます
              </p>
            </div>
          </div>
        ) : null}
      </Layout>
      <Toaster />
    </>
  );
}