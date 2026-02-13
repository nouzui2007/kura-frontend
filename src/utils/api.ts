import { debugLogger } from "./debug-logger";
import { createClient } from "./supabase/client";
import { toast } from "sonner@2.0.3";

// 本番環境のSupabase APIエンドポイント
const API_BASE_URL =
  "https://etddfgnuwagrtgnvqcum.supabase.co/functions/v1";
const SECRET_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0ZGRmZ251d2FncnRnbnZxY3VtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQxMTQ2MCwiZXhwIjoyMDc1OTg3NDYwfQ.0D2ElCkfA-ybHbpeiqQgZqsqE7uZx111hwuC18cHEUo";

async function getAuthHeaders() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SECRET_KEY}`,
  };
}

/**
 * 共通リクエスト関数
 * エラーハンドリングとトースト表示を一元化
 */
async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  errorMessage = "APIエラーが発生しました",
): Promise<T | null> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (!response.ok) {
      let errorDetail = "";
      try {
        const errorJson = await response.json();
        errorDetail =
          errorJson.error ||
          errorJson.message ||
          JSON.stringify(errorJson);
      } catch (e) {
        errorDetail = await response.text();
      }

      console.error(
        `API Error (${response.status}) on ${path}:`,
        errorDetail,
      );
      debugLogger.error(
        `API Error (${response.status}) on ${path}`,
        { errorDetail },
      );

      // 具体的なエラーメッセージがあればそれを表示、なければデフォルト
      toast.error(
        `${errorMessage}${errorDetail ? `: ${errorDetail}` : ""}`,
      );
      return null;
    }

    const result = await response.json();

    // バックエンドの成功フラグを確認 (配列で返る場合もある)
    if (Array.isArray(result)) return result as T;

    if (
      result &&
      typeof result === "object" &&
      "success" in result
    ) {
      if (!result.success) {
        const logicError =
          result.error || "論理エラーが発生しました";
        console.error(
          `API logic error on ${path}:`,
          logicError,
        );
        debugLogger.error(
          `API logic error on ${path}`,
          logicError,
        );
        toast.error(`${errorMessage}: ${logicError}`);
        return null;
      }
      return result.data as T;
    }

    return result as T;
  } catch (error) {
    const networkError =
      error instanceof Error ? error.message : String(error);
    console.error(`Network error on ${path}:`, error);
    debugLogger.error(`Network error on ${path}`, {
      error: networkError,
    });
    toast.error(`${errorMessage}: ${networkError}`);
    return null;
  }
}

export interface Staff {
  id: string;
  // 基本情報
  employeeId: string; // 従業員ID
  lastName: string; // 姓
  firstName: string; // 名
  lastNameKana?: string; // 姓カナ
  firstNameKana?: string; // 名カナ
  gender?: "male" | "female" | "other"; // 性別
  birthDate?: string; // 生年月日
  postalCode?: string; // 郵便番号
  address?: string; // 住所
  phone?: string; // 電話番号
  email?: string; // メールアドレス

  // 雇用情報
  employmentType?:
    | "full-time"
    | "contract"
    | "part-time"
    | "temporary"; // 雇用形態
  department: string; // 所属部署
  hireDate?: string; // 入社日
  retireDate?: string; // 退社日
  workType?: "regular" | "irregular"; // 勤務区分
  workLocation?: string; // 勤務地

  // 給与情報
  monthlySalary?: number; // 月給
  hourlyRate?: number; // 時給
  allowances?: Array<{ name: string; amount: number }>; // 手当
  deductions?: Array<{ name: string; amount: number }>; // 控除
  bankName?: string; // 銀行名
  branchName?: string; // 支店名
  accountType?: "checking" | "savings"; // 口座種別
  accountNumber?: string; // 口座番号

  // 後方互換性のための統合フィールド
  name: string; // lastName + firstName
}

export interface Attendance {
  id?: string; // 勤怠データID（更新時に使用）
  date: string;
  staffId: string;
  startTime: string;
  endTime: string;
  workHours: number; // 実働時間（勤務時間 - 休憩時間）
  breakMinutes?: number; // 休憩時間（分）
  overtimeHours?: number; // 残業時間（表示のみ、APIには送らない）
  
  // 勤務分析結果
  earlyOvertime?: boolean; // 早出残業の有無
  overtime?: boolean; // 残業の有無
  earlyLeave?: boolean; // 早上（早上手当）の有無
  lateNightOvertimeHours?: number; // 深夜残業時間
}

export interface StaffPayrollSettings {
  staffId: string;
  hourlyRate: number; // 時給
  baseSalary?: number; // 月給（オプション）
}

export interface PayrollData {
  id: string;
  staffId: string;
  month: string; // YYYY-MM
  data: {
    // 給与情報
    baseSalary?: number; // 月給制の基本給
    basePay?: number; // 時給制の基本給
    hourlyRate?: number; // 時給
    overtimePay: number; // 残業代

    // 勤務時間情報
    regularHours?: number; // 通常勤務時間
    overtimeHours: number; // 残業時間
    totalWorkHours: number; // 総勤務時間
    workDays: number; // 出勤日数

    // 手当と控除
    allowances: Array<{ name: string; amount: number }>; // 手当
    allowancesTotal: number; // 手当合計
    deductions: Array<{ name: string; amount: number }>; // 控除
    deductionsTotal: number; // 控除合計

    // 合計
    total: number; // 差引支給額
  };
  created_at?: string;
  updated_at?: string;
}

// スタッフマスターAPI
export const staffApi = {
  // スタッフ一覧を取得
  async getAll(): Promise<Staff[]> {
    const data = await apiRequest<Staff[]>(
      "/staff",
      {},
      "スタッフ一覧の取得に失敗しました",
    );
    return data || [];
  },

  // スタッフを登録
  async create(staff: Staff): Promise<Staff | null> {
    return await apiRequest<Staff>(
      "/staff",
      {
        method: "POST",
        body: JSON.stringify(staff),
      },
      "スタッフの登録に失敗しました",
    );
  },

  // スタッフ情報を更新
  async update(staff: Staff): Promise<Staff | null> {
    return await apiRequest<Staff>(
      `/staff/${staff.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(staff),
      },
      "スタッフ情報の更新に失敗しました",
    );
  },

  // スタッフを削除
  async delete(id: string): Promise<boolean> {
    const result = await apiRequest<any>(
      `/staff/${id}`,
      {
        method: "DELETE",
      },
      "スタッフの削除に失敗しました",
    );
    return !!result;
  },
};

// 勤怠記録API
export const attendanceApi = {
  // 指定日の勤怠記録を取得
  async getByDate(date: string): Promise<Attendance[]> {
    const data = await apiRequest<Attendance[]>(
      `/attendance/${date}`,
      {},
      "勤怠記録の取得に失敗しました",
    );
    return data || [];
  },

  // 勤怠記録を保存
  async save(
    attendance: Attendance,
  ): Promise<Attendance | null> {
    return await apiRequest<Attendance>(
      "/attendance",
      {
        method: "POST",
        body: JSON.stringify(attendance),
      },
      "勤怠記録の保存に失敗しました",
    );
  },

  // 勤怠記録を更新
  async update(
    id: string,
    attendance: Partial<Attendance>,
  ): Promise<Attendance | null> {
    return await apiRequest<Attendance>(
      `/attendance/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(attendance),
      },
      "勤怠記録の更新に失敗しました",
    );
  },

  // 複数の勤怠記録を一括保存
  async saveBulk(
    date: string,
    attendanceList: Partial<Attendance>[],
  ): Promise<boolean> {
    const result = await apiRequest<any>(
      "/attendance/bulk",
      {
        method: "POST",
        body: JSON.stringify({ date, attendanceList }),
      },
      "勤怠記録の一括保存に失敗しました",
    );
    return !!result;
  },

  // 勤怠記録を削除
  async delete(
    date: string,
    staffId: string,
  ): Promise<boolean> {
    const result = await apiRequest<any>(
      `/attendance/${date}/${staffId}`,
      {
        method: "DELETE",
      },
      "勤怠記録の削除に失敗しました",
    );
    return !!result;
  },

  // 期間指定で勤怠記録を取得
  async getByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Attendance[]> {
    const data = await apiRequest<Attendance[]>(
      `/attendance?start=${startDate}&end=${endDate}`,
      {},
      "期間指定の勤怠記録取得に失敗しました",
    );
    return data || [];
  },

  // 月次勤怠記録を取得（YYYY-MM形式）
  async getByMonth(month: string): Promise<Attendance[]> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay}`;
    return this.getByDateRange(startDate, endDate);
  },
};

// 給与計算API
export const payrollApi = {
  // 給与計算を実行（サーバーサイドで計算）
  async calculate(month: string): Promise<any> {
    return await apiRequest<any>(
      "/payroll/calculate",
      {
        method: "POST",
        body: JSON.stringify({ "target-month": month }),
      },
      "給与計算に失敗しました",
    );
  },

  // スタッフの時給設定を取得
  async getStaffSettings(
    staffId: string,
  ): Promise<StaffPayrollSettings | null> {
    return await apiRequest<StaffPayrollSettings>(
      `/payroll/settings/${staffId}`,
      {},
      "給与設定の取に失敗しました",
    );
  },

  // スタッフの時給設定を保存
  async saveStaffSettings(
    settings: StaffPayrollSettings,
  ): Promise<boolean> {
    const result = await apiRequest<any>(
      "/payroll/settings",
      {
        method: "POST",
        body: JSON.stringify(settings),
      },
      "給与設定の保存に失敗しました",
    );
    return !!result;
  },

  // 月次給与データを取得
  async getByMonth(month: string): Promise<PayrollData[]> {
    const data = await apiRequest<PayrollData[]>(
      `/payroll/${month}`,
      {},
      "給与データの取得に失敗しました",
    );
    return data || [];
  },

  // 給与データを保存
  async save(
    payrollData: PayrollData,
  ): Promise<PayrollData | null> {
    return await apiRequest<PayrollData>(
      "/payroll",
      {
        method: "POST",
        body: JSON.stringify(payrollData),
      },
      "給与データの保存に失敗しました",
    );
  },

  // 給与データを削除
  async delete(id: string): Promise<boolean> {
    const result = await apiRequest<any>(
      `/payroll/${id}`,
      {
        method: "DELETE",
      },
      "給与データの削除に失敗しました",
    );
    return !!result;
  },
};

// サンプルデータAPI
export const sampleDataApi = {
  async create(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    const result = await apiRequest<any>(
      "/sample-data/create",
      { method: "POST" },
      "サンプルデータの作成に失敗しました",
    );
    return result
      ? { success: true, data: result }
      : { success: false, error: "不明なエラー" };
  },
};

// システム設定の型定義
export interface SystemSettings {
  // 労働時間設定
  regularHoursPerDay: number; // 法定労働時間（時間/日）
  defaultBreakMinutes: number; // デフォルト休憩時間（分）
  breakMinutesFor6Hours: number; // 6時間超の法定休憩時間（分）
  breakMinutesFor8Hours: number; // 8時間超の法定休憩時間（分）

  // 残業設定
  overtimeThreshold: number; // 月の残業時間閾値（時間）
  overtimeRate: number; // 残業割増率（%）
  excessOvertimeRate: number; // 超過残業割増率（%）
  lateNightRate: number; // 深夜割増率（%）
  holidayRate: number; // 休日割増率（%）
  lateNightStartHour: number; // 深夜時間帯開始（時）
  lateNightEndHour: number; // 深夜時間帯終了（時）
  earlyOvertimeStandardHour: number; // 早出残業基準時間（時）
  earlyLeaveStandardHour: number; // 早上基準時刻（時）
  overtimeStandardHour: number; // 残業基準時刻（時）

  // 給与設定
  defaultHourlyRate: number; // デフォルト時給（円）
}

// デフォルトのシステム設定
export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  regularHoursPerDay: 8,
  defaultBreakMinutes: 60,
  breakMinutesFor6Hours: 45,
  breakMinutesFor8Hours: 60,
  overtimeThreshold: 45,
  overtimeRate: 25,
  excessOvertimeRate: 50,
  lateNightRate: 25,
  holidayRate: 35,
  lateNightStartHour: 22,
  lateNightEndHour: 5,
  earlyOvertimeStandardHour: 9,
  earlyLeaveStandardHour: 17,
  overtimeStandardHour: 17,
  defaultHourlyRate: 1200,
};

// システム設定API
export const systemSettingsApi = {
  // システム設定を取得
  async get(): Promise<SystemSettings> {
    const data = await apiRequest<SystemSettings[] | SystemSettings>(
      "/system-settings",
      {},
      "システム設定の取得に失敗しました",
    );
    
    // 配列で返ってくる場合は最初の要素を取得
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    }
    
    // オブジェクトで返ってくる場合はそのまま返す
    if (data && !Array.isArray(data)) {
      return data;
    }
    
    // データがない場合はデフォルト設定を返す
    return DEFAULT_SYSTEM_SETTINGS;
  },

  // システム設定を保存（更新）
  async save(settings: SystemSettings): Promise<boolean> {
    // まず既存の設定を取得してIDを確認
    const existingData = await apiRequest<SystemSettings[] | SystemSettings>(
      "/system-settings",
      {},
      "システム設定の取得に失敗しました",
    );
    
    let existingSettings: (SystemSettings & { id?: string }) | null = null;
    
    // 既存データからIDを取得
    if (Array.isArray(existingData) && existingData.length > 0) {
      existingSettings = existingData[0] as SystemSettings & { id?: string };
    } else if (existingData && !Array.isArray(existingData)) {
      existingSettings = existingData as SystemSettings & { id?: string };
    }
    
    // 既存データがある場合は更新、ない場合は新規作成
    if (existingSettings && existingSettings.id) {
      // 更新処理（PATCH）
      const result = await apiRequest<any>(
        `/system-settings/${existingSettings.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(settings),
        },
        "システム設定の更新に失敗しました",
      );
      return !!result;
    } else {
      // 新規作成（POST）- 初回のみ
      const result = await apiRequest<any>(
        "/system-settings",
        {
          method: "POST",
          body: JSON.stringify(settings),
        },
        "システム設定の作成に失敗しました",
      );
      return !!result;
    }
  },
};

// プロフィール/権限管理API
export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  username: string;
  role: string | null; // profile.role (profileがnullの場合はnull)
  has_role: boolean;
}

export interface RoleOption {
  value: string;
  label: string;
}

// 勤務分析API
export interface WorkAnalysisRequest {
  staffId: string;
  workStartTime: string; // HH:mm形式
  workEndTime: string;   // HH:mm形式
  date: string;          // YYYY-MM-DD形式
}

export interface WorkAnalysisResponse {
  staffId: string;
  date: string;
  workStartTime: string;
  workEndTime: string;
  earlyOvertime: boolean;      // 早出残業の有無
  overtime: boolean;           // 残業の有無
  earlyLeave: boolean;         // 早退の有無
  lateNightOvertimeHours: number; // 深夜残業時間
}

export const workAnalysisApi = {
  // 勤務分析を実行
  async analyze(request: WorkAnalysisRequest): Promise<WorkAnalysisResponse | null> {
    return await apiRequest<WorkAnalysisResponse>(
      "/work-analysis",
      {
        method: "POST",
        body: JSON.stringify(request),
      },
      "勤務分析に失敗しました",
    );
  },
};

export const profileApi = {
  // ユーザー一覧を取得（Supabase Authenticationのユーザーとprofile情報を含む）
  async getUsers(): Promise<UserProfile[]> {
    const data = await apiRequest<UserProfile[]>(
      "/profile",
      {},
      "ユーザー一覧の取得に失敗しました",
    );
    // console.log('/profile から取得したデータ:', data);

    return data || [];
  },

  // 権限一覧を取得
  async getRoles(): Promise<RoleOption[]> {
    const data = await apiRequest<RoleOption[]>(
      "/profile/roles",
      {},
      "権限一覧の取得に失敗しました",
    );
    return data;
  },

  // ユーザーの権限情報を取得（profileがない場合はnullを返す）
  async getProfile(uid: string): Promise<UserProfile | null> {
    return await apiRequest<UserProfile>(
      `/profile/${uid}`,
      {},
      "プロフィール情報の取得に失敗しました",
    );
  },

  // ユーザーの権限を作成（profileが存在しない場合）
  async createProfile(
    uid: string,
    username?: string,
    role?: string,
  ): Promise<boolean> {
    const result = await apiRequest<any>(
      `/profile`,
      {
        method: "POST",
        body: JSON.stringify({
          uid: uid,
          username: username,
          role: role,
        }),
      },
      "権限の作成に失敗しました",
    );
    return !!result;
  },

  // ユーザーの権限を更新（profileが既に存在する場合）
  async updateRole(id: string, role: string): Promise<boolean> {
    const result = await apiRequest<any>(
      `/profile/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      },
      "権限の更新に失敗しました",
    );
    return !!result;
  },

  // ユーザー名を更新
  async updateUsername(
    id: string,
    username: string,
  ): Promise<boolean> {
    const result = await apiRequest<any>(
      `/profile/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ username }),
      },
      "ユーザー名の更新に失敗しました",
    );
    return !!result;
  },
};