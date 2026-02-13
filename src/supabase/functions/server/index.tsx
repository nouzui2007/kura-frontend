import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

// Supabaseクライアントの作成
const getSupabaseAdmin = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
};

// 認証: サインアップ
app.post('/make-server-65f3fb20/auth/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, role } = body;
    
    if (!email || !password) {
      return c.json({ success: false, error: 'メールアドレスとパスワードは必須です' }, 400);
    }

    const supabase = getSupabaseAdmin();
    
    // ユーザーを作成
    // Automatically confirm the user's email since an email server hasn't been configured.
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        name: name || '',
        role: role || 'user' // デフォルトは一般ユーザー
      },
      email_confirm: true,
    });

    if (error) {
      console.log('Signup error:', error);
      return c.json({ success: false, error: error.message }, 400);
    }

    return c.json({ success: true, data: { id: data.user.id, email: data.user.email } });
  } catch (error) {
    console.log('Error during signup:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// スタッフマスターの取得
app.get('/make-server-65f3fb20/staff', async (c) => {
  try {
    const staffList = await kv.getByPrefix('staff:');
    return c.json({ success: true, data: staffList });
  } catch (error) {
    console.log('Error fetching staff list:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// スタッフの登録
app.post('/make-server-65f3fb20/staff', async (c) => {
  try {
    const body = await c.req.json();
    const staffData = body;
    
    if (!staffData.id || !staffData.name) {
      return c.json({ success: false, error: 'id and name are required' }, 400);
    }
    
    await kv.set(`staff:${staffData.id}`, staffData);
    
    return c.json({ success: true, data: staffData });
  } catch (error) {
    console.log('Error creating staff:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// スタッフの更新
app.patch('/make-server-21c9a9d3/staff/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const staffData = { ...body, id };
    
    await kv.set(`staff:${id}`, staffData);
    
    return c.json({ success: true, data: staffData });
  } catch (error) {
    console.log('Error updating staff:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// スタッフの削除
app.delete('/make-server-65f3fb20/staff/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`staff:${id}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting staff:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 指定日の勤怠記録を取得
app.get('/make-server-65f3fb20/attendance/:date', async (c) => {
  try {
    const date = c.req.param('date');
    const attendanceList = await kv.getByPrefix(`attendance:${date}:`);
    
    return c.json({ success: true, data: attendanceList });
  } catch (error) {
    console.log('Error fetching attendance:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 期間指定で勤怠記録を取得
app.get('/make-server-65f3fb20/attendance/range', async (c) => {
  try {
    const startDate = c.req.query('start');
    const endDate = c.req.query('end');
    
    if (!startDate || !endDate) {
      return c.json({ success: false, error: 'start and end query parameters are required' }, 400);
    }
    
    console.log('Fetching attendance range:', { startDate, endDate });
    
    // 全勤怠データを取得
    const allAttendance = await kv.getByPrefix('attendance:');
    console.log('Total attendance records:', allAttendance.length);
    
    // 期間内のデータをフィルタリング
    const filteredAttendance = allAttendance.filter((att: any) => {
      return att.date >= startDate && att.date <= endDate;
    });
    
    console.log('Filtered attendance records:', filteredAttendance.length);
    
    return c.json({ success: true, data: filteredAttendance });
  } catch (error) {
    console.log('Error fetching attendance range:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 勤怠記録の保存
app.post('/make-server-65f3fb20/attendance', async (c) => {
  try {
    const body = await c.req.json();
    const { date, staffId, startTime, endTime, workHours } = body;
    
    if (!date || !staffId) {
      return c.json({ success: false, error: 'date and staffId are required' }, 400);
    }
    
    const attendanceData = { 
      date, 
      staffId, 
      startTime: startTime || '', 
      endTime: endTime || '', 
      workHours: workHours || 0,
      breakMinutes: body.breakMinutes || 0,
      actualWorkHours: body.actualWorkHours || 0,
      overtimeHours: body.overtimeHours || 0
    };
    
    await kv.set(`attendance:${date}:${staffId}`, attendanceData);
    
    return c.json({ success: true, data: attendanceData });
  } catch (error) {
    console.log('Error saving attendance:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 複数の勤怠記録を一括保存
app.post('/make-server-65f3fb20/attendance/bulk', async (c) => {
  try {
    const body = await c.req.json();
    const { date, attendanceList } = body;
    
    if (!date || !Array.isArray(attendanceList)) {
      return c.json({ success: false, error: 'date and attendanceList array are required' }, 400);
    }
    
    const keys: string[] = [];
    const values: any[] = [];
    
    attendanceList.forEach(item => {
      keys.push(`attendance:${date}:${item.staffId}`);
      values.push({
        date,
        staffId: item.staffId,
        startTime: item.startTime || '',
        endTime: item.endTime || '',
        workHours: item.workHours || 0,
        breakMinutes: item.breakMinutes || 0,
        actualWorkHours: item.actualWorkHours || 0,
        overtimeHours: item.overtimeHours || 0
      });
    });
    
    if (keys.length > 0) {
      await kv.mset(keys, values);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Error bulk saving attendance:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 勤怠記録の削除
app.delete('/make-server-65f3fb20/attendance/:date/:staffId', async (c) => {
  try {
    const date = c.req.param('date');
    const staffId = c.req.param('staffId');
    
    await kv.del(`attendance:${date}:${staffId}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting attendance:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ユーザー管理: ユーザー一覧取得（管理者のみ）
app.get('/make-server-65f3fb20/users', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const supabase = getSupabaseAdmin();
    
    // 認証チェック
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    // 管理者権限チェック（システム管理者も含む）
    const userRole = authData.user.user_metadata?.role;
    if (userRole !== 'admin' && userRole !== 'system-admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }
    
    // ユーザー一覧を取得
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.log('Error fetching users:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    // 必要な情報のみ返す
    const userList = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || '',
      role: user.user_metadata?.role || 'user',
      created_at: user.created_at,
    }));
    
    return c.json({ success: true, data: userList });
  } catch (error) {
    console.log('Error in users list:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ユーザー管理: 役割更新（管理者のみ）
app.put('/make-server-65f3fb20/users/:userId/role', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = c.req.param('userId');
    const body = await c.req.json();
    const { role } = body;
    
    if (!role || !['system-admin', 'admin', 'user'].includes(role)) {
      return c.json({ success: false, error: 'Invalid role' }, 400);
    }
    
    const supabase = getSupabaseAdmin();
    
    // 認証チェック
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    // 管理者権限チェック（システム管理者も含む）
    const currentUserRole = authData.user.user_metadata?.role;
    if (currentUserRole !== 'admin' && currentUserRole !== 'system-admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }
    
    // 自分自身の役割は変更不可
    if (authData.user.id === userId) {
      return c.json({ success: false, error: 'Cannot change your own role' }, 400);
    }
    
    // 既存のユーザー情報を取得
    const { data: existingUser } = await supabase.auth.admin.getUserById(userId);
    
    // 役割を更新（既存のnameを保持）
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { 
        name: existingUser?.user?.user_metadata?.name || '',
        role 
      },
    });
    
    if (error) {
      console.log('Error updating user role:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data });
  } catch (error) {
    console.log('Error in role update:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ユーザー管理: ユーザー削除（管理者のみ）
app.delete('/make-server-65f3fb20/users/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = c.req.param('userId');
    
    const supabase = getSupabaseAdmin();
    
    // 認証チェック
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    
    // 管理者権限チェック（システム管理者も含む）
    const userRole = authData.user.user_metadata?.role;
    if (userRole !== 'admin' && userRole !== 'system-admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }
    
    // 自分自身は削除不可
    if (authData.user.id === userId) {
      return c.json({ success: false, error: 'Cannot delete your own account' }, 400);
    }
    
    // ユーザーを削除
    const { error } = await supabase.auth.admin.deleteUser(userId);
    
    if (error) {
      console.log('Error deleting user:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Error in user deletion:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 期間指定で勤怠記録を取得
app.get('/make-server-65f3fb20/attendance/range', async (c) => {
  try {
    const start = c.req.query('start');
    const end = c.req.query('end');
    
    if (!start || !end) {
      return c.json({ success: false, error: 'start and end date are required' }, 400);
    }
    
    // 期間内のすべての勤怠記録を取得
    const allAttendance = await kv.getByPrefix('attendance:');
    
    // 期間でフィルタリング
    const filteredAttendance = allAttendance.filter((att: any) => {
      return att.date >= start && att.date <= end;
    });
    
    return c.json({ success: true, data: filteredAttendance });
  } catch (error) {
    console.log('Error fetching attendance range:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 給与計算: スタッフの時給設定を取得
app.get('/make-server-65f3fb20/payroll/settings/:staffId', async (c) => {
  try {
    const staffId = c.req.param('staffId');
    const settings = await kv.get(`payroll:settings:${staffId}`);
    
    return c.json({ success: true, data: settings });
  } catch (error) {
    console.log('Error fetching payroll settings:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 給与計算: スタッフの時給設定を保存
app.post('/make-server-65f3fb20/payroll/settings', async (c) => {
  try {
    const body = await c.req.json();
    const { staffId, hourlyRate, baseSalary } = body;
    
    if (!staffId || !hourlyRate) {
      return c.json({ success: false, error: 'staffId and hourlyRate are required' }, 400);
    }
    
    const settings = { staffId, hourlyRate, baseSalary };
    await kv.set(`payroll:settings:${staffId}`, settings);
    
    return c.json({ success: true, data: settings });
  } catch (error) {
    console.log('Error saving payroll settings:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 給与計算: 月次給与データを取得
app.get('/make-server-65f3fb20/payroll/:month', async (c) => {
  try {
    const month = c.req.param('month');
    const payrollList = await kv.getByPrefix(`payroll:${month}:`);
    
    return c.json({ success: true, data: payrollList });
  } catch (error) {
    console.log('Error fetching payroll:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 給与計算: 給与データを保存
app.post('/make-server-65f3fb20/payroll', async (c) => {
  try {
    const body = await c.req.json();
    const { id, staffId, month } = body;
    
    if (!id || !staffId || !month) {
      return c.json({ success: false, error: 'id, staffId and month are required' }, 400);
    }
    
    const payrollData = {
      ...body,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(`payroll:${month}:${staffId}`, payrollData);
    
    return c.json({ success: true, data: payrollData });
  } catch (error) {
    console.log('Error saving payroll:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// 給与計算: 給与データを削除
app.delete('/make-server-65f3fb20/payroll/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // idからmonthとstaffIdを抽出する必要があるため、全取得してフィルタ
    const allPayroll = await kv.getByPrefix('payroll:');
    const target = allPayroll.find((p: any) => p.id === id);
    
    if (target) {
      await kv.del(`payroll:${target.month}:${target.staffId}`);
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.log('Error deleting payroll:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// システム設定: 設定を取得
app.get('/make-server-65f3fb20/system-settings', async (c) => {
  try {
    const settings = await kv.get('system:settings');
    
    // デフォルト設定
    const defaultSettings = {
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
      defaultHourlyRate: 1200,
    };
    
    return c.json({ success: true, data: settings || defaultSettings });
  } catch (error) {
    console.log('Error fetching system settings:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// システム設定: 設定を保存
app.post('/make-server-65f3fb20/system-settings', async (c) => {
  try {
    const body = await c.req.json();
    await kv.set('system:settings', body);
    
    return c.json({ success: true, data: body });
  } catch (error) {
    console.log('Error saving system settings:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// サンプルデータの作成
app.post('/make-server-65f3fb20/sample-data/create', async (c) => {
  try {
    console.log('Creating sample data...');
    
    // スタッフ3名のデータ
    const sampleStaff = [
      {
        id: 'staff_001',
        employeeId: 'EMP001',
        lastName: '山田',
        firstName: '太郎',
        lastNameKana: 'ヤマダ',
        firstNameKana: 'タロウ',
        gender: 'male',
        birthDate: '1985-04-15',
        postalCode: '150-0001',
        address: '東京都渋谷区神宮前1-1-1',
        phone: '090-1234-5678',
        email: 'yamada@example.com',
        employmentType: 'full-time',
        department: '医療部',
        hireDate: '2020-04-01',
        workType: 'regular',
        workLocation: '東京本院',
        monthlySalary: 350000,
        hourlyRate: 2000,
        allowances: [
          { name: '交通費', amount: 15000 },
          { name: '住宅手当', amount: 30000 }
        ],
        deductions: [
          { name: '社会保険', amount: 35000 },
          { name: '厚生年金', amount: 32000 }
        ],
        bankName: '三菱UFJ銀行',
        branchName: '渋谷支店',
        accountType: 'checking',
        accountNumber: '1234567',
        name: '山田 太郎'
      },
      {
        id: 'staff_002',
        employeeId: 'EMP002',
        lastName: '佐藤',
        firstName: '花子',
        lastNameKana: 'サトウ',
        firstNameKana: 'ハナコ',
        gender: 'female',
        birthDate: '1990-08-22',
        postalCode: '150-0002',
        address: '東京都渋谷区渋谷2-2-2',
        phone: '090-2345-6789',
        email: 'sato@example.com',
        employmentType: 'part-time',
        department: '看護部',
        hireDate: '2021-06-01',
        workType: 'irregular',
        workLocation: '東京本院',
        hourlyRate: 1500,
        allowances: [
          { name: '交通費', amount: 10000 }
        ],
        deductions: [
          { name: '社会保険', amount: 12000 }
        ],
        bankName: 'みずほ銀行',
        branchName: '新宿支店',
        accountType: 'checking',
        accountNumber: '2345678',
        name: '佐藤 花子'
      },
      {
        id: 'staff_003',
        employeeId: 'EMP003',
        lastName: '鈴木',
        firstName: '次郎',
        lastNameKana: 'スズキ',
        firstNameKana: 'ジロウ',
        gender: 'male',
        birthDate: '1988-12-05',
        postalCode: '150-0003',
        address: '東京都渋谷区恵比寿3-3-3',
        phone: '090-3456-7890',
        email: 'suzuki@example.com',
        employmentType: 'contract',
        department: '事務部',
        hireDate: '2022-01-15',
        workType: 'regular',
        workLocation: '東京本院',
        monthlySalary: 280000,
        hourlyRate: 1800,
        allowances: [
          { name: '交通費', amount: 12000 },
          { name: '資格手当', amount: 20000 }
        ],
        deductions: [
          { name: '社会保険', amount: 28000 },
          { name: '厚生年金', amount: 25000 }
        ],
        bankName: '三井住友銀行',
        branchName: '恵比寿支店',
        accountType: 'checking',
        accountNumber: '3456789',
        name: '鈴木 次郎'
      }
    ];

    // スタッフを保存
    for (const staff of sampleStaff) {
      await kv.set(`staff:${staff.id}`, staff);
    }
    console.log('Sample staff created');

    // 2025年8月の勤怠データ
    const august2025Attendance = [
      // 山田太郎 - 8月（22日勤務、一部残業あり）
      ...Array.from({ length: 22 }, (_, i) => {
        const isOvertimeDay = i % 5 === 0; // 5日に1回残業
        return {
          date: `2025-08-${String(i + 1).padStart(2, '0')}`,
          staffId: 'staff_001',
          startTime: '09:00',
          endTime: isOvertimeDay ? '19:00' : '18:00',
          workHours: isOvertimeDay ? 10 : 9,
          breakMinutes: 60,
          actualWorkHours: isOvertimeDay ? 9 : 8,
          overtimeHours: isOvertimeDay ? 1 : 0
        };
      }),
      // 佐藤花子 - 8月（18日勤務、パート、残業なし）
      ...Array.from({ length: 18 }, (_, i) => ({
        date: `2025-08-${String(i + 1).padStart(2, '0')}`,
        staffId: 'staff_002',
        startTime: '10:00',
        endTime: '16:00',
        workHours: 6,
        breakMinutes: 45,
        actualWorkHours: 5.25,
        overtimeHours: 0
      })),
      // 鈴木次郎 - 8月（21日勤務、一部残業あり）
      ...Array.from({ length: 21 }, (_, i) => {
        const isOvertimeDay = i % 4 === 0; // 4日に1回残業
        return {
          date: `2025-08-${String(i + 1).padStart(2, '0')}`,
          staffId: 'staff_003',
          startTime: '09:30',
          endTime: isOvertimeDay ? '19:30' : '18:30',
          workHours: isOvertimeDay ? 10 : 9,
          breakMinutes: 60,
          actualWorkHours: isOvertimeDay ? 9 : 8,
          overtimeHours: isOvertimeDay ? 1 : 0
        };
      })
    ];

    // 2025年9月の勤怠データ
    const september2025Attendance = [
      // 山田太郎 - 9月（20日勤務、一部残業あり）
      ...Array.from({ length: 20 }, (_, i) => {
        const isOvertimeDay = i % 5 === 0; // 5日に1回残業
        return {
          date: `2025-09-${String(i + 1).padStart(2, '0')}`,
          staffId: 'staff_001',
          startTime: '09:00',
          endTime: isOvertimeDay ? '19:00' : '18:00',
          workHours: isOvertimeDay ? 10 : 9,
          breakMinutes: 60,
          actualWorkHours: isOvertimeDay ? 9 : 8,
          overtimeHours: isOvertimeDay ? 1 : 0
        };
      }),
      // 佐藤花子 - 9月（16日勤務、パート、残業なし）
      ...Array.from({ length: 16 }, (_, i) => ({
        date: `2025-09-${String(i + 1).padStart(2, '0')}`,
        staffId: 'staff_002',
        startTime: '10:00',
        endTime: '16:00',
        workHours: 6,
        breakMinutes: 45,
        actualWorkHours: 5.25,
        overtimeHours: 0
      })),
      // 鈴木次郎 - 9月（19日勤務、一部残業あり）
      ...Array.from({ length: 19 }, (_, i) => {
        const isOvertimeDay = i % 4 === 0; // 4日に1回残業
        return {
          date: `2025-09-${String(i + 1).padStart(2, '0')}`,
          staffId: 'staff_003',
          startTime: '09:30',
          endTime: isOvertimeDay ? '19:30' : '18:30',
          workHours: isOvertimeDay ? 10 : 9,
          breakMinutes: 60,
          actualWorkHours: isOvertimeDay ? 9 : 8,
          overtimeHours: isOvertimeDay ? 1 : 0
        };
      })
    ];

    // 勤怠データを保存
    for (const att of [...august2025Attendance, ...september2025Attendance]) {
      await kv.set(`attendance:${att.date}:${att.staffId}`, att);
    }
    console.log('Sample attendance created');

    // 2025年8月の給与計算結果
    const august2025Payroll = [
      {
        id: 'payroll_2025-08_staff_001',
        staffId: 'staff_001',
        staffName: '山田 太郎',
        month: '2025-08',
        workDays: 22,
        workHours: 176,
        totalWorkHours: 176,
        regularHours: 160,
        overtimeHours: 16,
        baseSalary: 350000,
        regularPay: 320000,
        overtimePay: 40000,
        totalAllowances: 45000,
        totalDeductions: 67000,
        totalGrossPay: 405000,
        totalNetPay: 338000,
        customItems: [
          { id: 'allow_1', type: 'allowance', name: '交通費', amount: 15000 },
          { id: 'allow_2', type: 'allowance', name: '住宅手当', amount: 30000 },
          { id: 'deduct_1', type: 'deduction', name: '社会保険', amount: 35000 },
          { id: 'deduct_2', type: 'deduction', name: '厚生年金', amount: 32000 }
        ],
        updatedAt: '2025-08-31T10:00:00Z'
      },
      {
        id: 'payroll_2025-08_staff_002',
        staffId: 'staff_002',
        staffName: '佐藤 花子',
        month: '2025-08',
        workDays: 18,
        workHours: 90,
        totalWorkHours: 90,
        regularHours: 90,
        overtimeHours: 0,
        baseSalary: 0,
        regularPay: 135000,
        overtimePay: 0,
        totalAllowances: 10000,
        totalDeductions: 12000,
        totalGrossPay: 145000,
        totalNetPay: 133000,
        customItems: [
          { id: 'allow_1', type: 'allowance', name: '交通費', amount: 10000 },
          { id: 'deduct_1', type: 'deduction', name: '社会保険', amount: 12000 }
        ],
        updatedAt: '2025-08-31T10:00:00Z'
      },
      {
        id: 'payroll_2025-08_staff_003',
        staffId: 'staff_003',
        staffName: '鈴木 次郎',
        month: '2025-08',
        workDays: 21,
        workHours: 168,
        totalWorkHours: 168,
        regularHours: 160,
        overtimeHours: 8,
        baseSalary: 280000,
        regularPay: 288000,
        overtimePay: 18000,
        totalAllowances: 32000,
        totalDeductions: 53000,
        totalGrossPay: 338000,
        totalNetPay: 285000,
        customItems: [
          { id: 'allow_1', type: 'allowance', name: '交通費', amount: 12000 },
          { id: 'allow_2', type: 'allowance', name: '資格手当', amount: 20000 },
          { id: 'deduct_1', type: 'deduction', name: '社会保険', amount: 28000 },
          { id: 'deduct_2', type: 'deduction', name: '厚生年金', amount: 25000 }
        ],
        updatedAt: '2025-08-31T10:00:00Z'
      }
    ];

    // 2025年9月の給与計算結果
    const september2025Payroll = [
      {
        id: 'payroll_2025-09_staff_001',
        staffId: 'staff_001',
        staffName: '山田 太郎',
        month: '2025-09',
        workDays: 20,
        workHours: 160,
        totalWorkHours: 160,
        regularHours: 160,
        overtimeHours: 0,
        baseSalary: 350000,
        regularPay: 320000,
        overtimePay: 0,
        totalAllowances: 45000,
        totalDeductions: 67000,
        totalGrossPay: 365000,
        totalNetPay: 298000,
        customItems: [
          { id: 'allow_1', type: 'allowance', name: '交通費', amount: 15000 },
          { id: 'allow_2', type: 'allowance', name: '住宅手当', amount: 30000 },
          { id: 'deduct_1', type: 'deduction', name: '社会保険', amount: 35000 },
          { id: 'deduct_2', type: 'deduction', name: '厚生年金', amount: 32000 }
        ],
        updatedAt: '2025-09-30T10:00:00Z'
      },
      {
        id: 'payroll_2025-09_staff_002',
        staffId: 'staff_002',
        staffName: '佐藤 花子',
        month: '2025-09',
        workDays: 16,
        workHours: 80,
        totalWorkHours: 80,
        regularHours: 80,
        overtimeHours: 0,
        baseSalary: 0,
        regularPay: 120000,
        overtimePay: 0,
        totalAllowances: 10000,
        totalDeductions: 12000,
        totalGrossPay: 130000,
        totalNetPay: 118000,
        customItems: [
          { id: 'allow_1', type: 'allowance', name: '交通費', amount: 10000 },
          { id: 'deduct_1', type: 'deduction', name: '社会保険', amount: 12000 }
        ],
        updatedAt: '2025-09-30T10:00:00Z'
      },
      {
        id: 'payroll_2025-09_staff_003',
        staffId: 'staff_003',
        staffName: '鈴木 次郎',
        month: '2025-09',
        workDays: 19,
        workHours: 152,
        totalWorkHours: 152,
        regularHours: 152,
        overtimeHours: 0,
        baseSalary: 280000,
        regularPay: 273600,
        overtimePay: 0,
        totalAllowances: 32000,
        totalDeductions: 53000,
        totalGrossPay: 305600,
        totalNetPay: 252600,
        customItems: [
          { id: 'allow_1', type: 'allowance', name: '交通費', amount: 12000 },
          { id: 'allow_2', type: 'allowance', name: '資格手当', amount: 20000 },
          { id: 'deduct_1', type: 'deduction', name: '社会保険', amount: 28000 },
          { id: 'deduct_2', type: 'deduction', name: '厚生年金', amount: 25000 }
        ],
        updatedAt: '2025-09-30T10:00:00Z'
      }
    ];

    // 給与計算結果を保存
    for (const payroll of [...august2025Payroll, ...september2025Payroll]) {
      await kv.set(`payroll:${payroll.month}:${payroll.staffId}`, payroll);
    }
    console.log('Sample payroll created');

    // システム設定のデフォルト値を保存
    const defaultSystemSettings = {
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
      defaultHourlyRate: 1200,
    };
    await kv.set('system:settings', defaultSystemSettings);
    console.log('Default system settings created');

    return c.json({ 
      success: true, 
      message: 'Sample data created successfully',
      data: {
        staff: sampleStaff.length,
        attendance: august2025Attendance.length + september2025Attendance.length,
        payroll: august2025Payroll.length + september2025Payroll.length
      }
    });
  } catch (error) {
    console.log('Error creating sample data:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);