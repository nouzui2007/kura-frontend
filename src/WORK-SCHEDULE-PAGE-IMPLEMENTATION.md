# 勤務表画面の実装

## 概要

選択した年月ごとに全スタッフの勤怠情報を一覧表示する**勤務表画面**を追加しました。

---

## 機能概要

### 📅 勤務表画面

- **年月選択**: 前月・次月・今月へのナビゲーション
- **表形式表示**: 縦軸に日付、横軸にスタッフ
- **勤怠情報表示**: 各セルに出勤時間・退勤時間を表示
- **サマリー表示**: 各スタッフの月次サマリーを表示

---

## 追加・修正したファイル

### 1. `/components/work-schedule-page.tsx` (新規作成)

勤務表画面のメインコンポーネント

### 2. `/utils/api.ts`

`attendanceApi.getByMonth()` メソッドを追加

### 3. `/App.tsx`

- `Page` 型に `work-schedule` を追加
- `WorkSchedulePage` コンポーネントをインポート
- ルーティングに勤務表ページを追加

### 4. `/components/layout.tsx`

- ナビゲーションメニューに「勤務表」を追加
- `Calendar` アイコンをインポート

### 5. `/components/dashboard.tsx`

- ダッシュボードに「勤務表」カードを追加

---

## 画面構成

### 勤務表画面

```
┌──────────────────────────────────────────────────────────┐
│ 📅 勤務表                                                │
├──────────────────────────────────────────────────────────┤
│ [前月] ◀  2024年 1月  ▶ [次月]  [今月]                   │
├──────────────────────────────────────────────────────────┤
│ 日付 │ 山田太郎    │ 佐藤花子    │ 鈴木一郎    │ ...    │
│      │ EMP001     │ EMP002     │ EMP003     │         │
├──────┼────────────┼────────────┼────────────┼────────┤
│ 1(月)│ 出: 09:00  │ 出: 09:00  │ -          │         │
│      │ 退: 18:00  │ 退: 17:00  │            │         │
├──────┼────────────┼────────────┼────────────┼────────┤
│ 2(火)│ 出: 09:00  │ -          │ 出: 10:00  │         │
│      │ 退: 19:00  │            │ 退: 18:00  │         │
├──────┼────────────┼────────────┼────────────┼────────┤
│ ...  │ ...        │ ...        │ ...        │         │
├──────┼────────────┼────────────┼────────────┼────────┤
│ 31   │ 出: 09:00  │ 出: 09:00  │ -          │         │
│ (水) │ 退: 18:00  │ 退: 18:00  │            │         │
├──────┼────────────┼────────────┼────────────┼────────┤
│ 📈   │ 出勤日数: 20│ 出勤日数: 18│ 出勤日数: 22│         │
│ サマ │ 早出残業: 3 │ 早出残業: 0 │ 早出残業: 5 │         │
│ リー │ 残業: 10    │ 残業: 5     │ 残業: 12    │         │
│      │ 早上手当: 2 │ 早上手当: 0 │ 早上手当: 1 │         │
│      │ 深夜残業:5.5h│深夜残業:0.0h│深夜残業:8.0h│         │
└──────┴────────────┴────────────┴────────────┴────────┘
```

---

## 表示内容

### テーブルヘッダー

| 列 | 内容 |
|----|------|
| **日付** | 日付と曜日（例: `1(月)`, `15(水)`） |
| **スタッフ列** | スタッフ名と社員番号 |

### テーブルボディ（各セル）

各日付・スタッフのセルには以下を表示：

```
出: 09:00  ← 出勤時間（24時間形式）
退: 18:00  ← 退勤時間（24時間形式）
```

勤怠データがない場合：
```
-  ← ハイフン表示
```

### サマリー行（最下部）

各スタッフの月次サマリー：

| 項目 | 説明 |
|------|------|
| **出勤日数** | 出勤時刻と退勤時刻が両方ある日の合計 |
| **早出残業** | `earlyOvertime`が`true`の回数 |
| **残業** | `overtime`が`true`の回数 |
| **早上手当** | `earlyLeave`が`true`の回数 |
| **深夜残業** | `lateNightOvertimeHours`の合計（時間） |

---

## データ取得

### 1. API拡張: `attendanceApi.getByMonth()`

#### 実装

```typescript
// 月次勤怠記録を取得（YYYY-MM形式）
async getByMonth(month: string): Promise<Attendance[]> {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay}`;
  return this.getByDateRange(startDate, endDate);
}
```

#### 使用例

```typescript
// 2024年1月のデータを取得
const monthlyData = await attendanceApi.getByMonth('2024-01');
```

#### 内部動作

1. `month`パラメータ（`YYYY-MM`形式）を分解
2. 月の最初の日（`YYYY-MM-01`）と最後の日（`YYYY-MM-31`）を計算
3. `getByDateRange()` を呼び出して期間のデータを取得

---

## 主要コンポーネント

### `/components/work-schedule-page.tsx`

#### State管理

```typescript
const [currentDate, setCurrentDate] = useState(new Date());  // 表示中の年月
const [staffList, setStaffList] = useState<Staff[]>([]);     // スタッフ一覧
const [attendanceData, setAttendanceData] = useState<MonthlyAttendance>({});  // 勤怠データ
const [isLoading, setIsLoading] = useState(false);           // ローディング状態
```

#### データ構造

##### `MonthlyAttendance`

```typescript
interface MonthlyAttendance {
  [staffId: string]: {
    [day: number]: Attendance;
  };
}
```

**例**:
```typescript
{
  "staff-001": {
    1: { startTime: "09:00", endTime: "18:00", ... },
    2: { startTime: "09:00", endTime: "19:00", ... },
    ...
  },
  "staff-002": {
    1: { startTime: "10:00", endTime: "17:00", ... },
    ...
  }
}
```

##### `StaffSummary`

```typescript
interface StaffSummary {
  workDays: number;                 // 出勤日数
  earlyOvertimeCount: number;       // 早出残業回数
  overtimeCount: number;            // 残業回数
  earlyLeaveCount: number;          // 早上手当回数
  totalLateNightHours: number;      // 深夜残業時間合計
}
```

---

## 主要関数

### 1. `loadMonthlyAttendance()`

月次勤怠データを取得してStateに格納

```typescript
const loadMonthlyAttendance = async () => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthStr = `${year}-${month.toString().padStart(2, '0')}`;

  const allAttendance = await attendanceApi.getByMonth(monthStr);

  // スタッフID × 日付 のマップを作成
  const dataMap: MonthlyAttendance = {};
  allAttendance.forEach(att => {
    const day = new Date(att.date).getDate();
    if (!dataMap[att.staffId]) {
      dataMap[att.staffId] = {};
    }
    dataMap[att.staffId][day] = att;
  });

  setAttendanceData(dataMap);
};
```

### 2. `calculateSummary()`

スタッフの月次サマリーを計算

```typescript
const calculateSummary = (staffId: string): StaffSummary => {
  const staffAttendance = attendanceData[staffId] || {};
  let workDays = 0;
  let earlyOvertimeCount = 0;
  let overtimeCount = 0;
  let earlyLeaveCount = 0;
  let totalLateNightHours = 0;

  Object.values(staffAttendance).forEach(att => {
    if (att.startTime && att.endTime) {
      workDays++;
    }
    if (att.earlyOvertime) {
      earlyOvertimeCount++;
    }
    if (att.overtime) {
      overtimeCount++;
    }
    if (att.earlyLeave) {
      earlyLeaveCount++;
    }
    totalLateNightHours += att.lateNightOvertimeHours || 0;
  });

  return {
    workDays,
    earlyOvertimeCount,
    overtimeCount,
    earlyLeaveCount,
    totalLateNightHours,
  };
};
```

### 3. `formatTime()`

時間を24時間形式でフォーマット

```typescript
const formatTime = (time: string): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  return `${hours}:${minutes}`;
};
```

---

## UI要素

### 月選択ナビゲーション

```tsx
<Card className="p-4">
  <div className="flex items-center justify-between">
    <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
      <ChevronLeft className="h-4 w-4" />
      前月
    </Button>

    <div className="flex items-center gap-3">
      <div className="text-xl font-bold">
        {year}年 {month}月
      </div>
      <Button variant="outline" size="sm" onClick={goToCurrentMonth}>
        今月
      </Button>
    </div>

    <Button variant="outline" size="sm" onClick={goToNextMonth}>
      次月
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
</Card>
```

### テーブル構造

```tsx
<table className="w-full border-collapse">
  <thead>
    <tr>
      <th className="sticky left-0 z-10">日付</th>
      {staffList.map(staff => (
        <th key={staff.id}>
          <div>{staff.name}</div>
          <div>{staff.employeeId}</div>
        </th>
      ))}
    </tr>
  </thead>
  <tbody>
    {Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return (
        <tr key={day}>
          <td className="sticky left-0 z-10">
            {day} ({dayOfWeek})
          </td>
          {staffList.map(staff => {
            const attendance = attendanceData[staff.id]?.[day];
            return (
              <td key={staff.id}>
                {attendance ? (
                  <div>
                    <div>出: {formatTime(attendance.startTime)}</div>
                    <div>退: {formatTime(attendance.endTime)}</div>
                  </div>
                ) : (
                  <div>-</div>
                )}
              </td>
            );
          })}
        </tr>
      );
    })}
  </tbody>
  <tfoot>
    <tr>
      <td className="sticky left-0 z-10">
        <TrendingUp /> サマリー
      </td>
      {staffList.map(staff => {
        const summary = calculateSummary(staff.id);
        return (
          <td key={staff.id}>
            <div>出勤日数: {summary.workDays}日</div>
            <div>早出残業: {summary.earlyOvertimeCount}回</div>
            <div>残業: {summary.overtimeCount}回</div>
            <div>早上手当: {summary.earlyLeaveCount}回</div>
            <div>深夜残業: {summary.totalLateNightHours.toFixed(1)}h</div>
          </td>
        );
      })}
    </tr>
  </tfoot>
</table>
```

---

## スタイリング

### 土日の背景色

```tsx
const isWeekend = date.getDay() === 0 || date.getDay() === 6;

<td className={isWeekend ? 'bg-red-50' : 'bg-background'}>
  ...
</td>
```

### Sticky列（日付列）

```tsx
<td className="sticky left-0 z-10 bg-background">
  {day}
</td>
```

日付列は横スクロール時も固定表示されます。

### サマリー行の背景色

```tsx
<td className="bg-blue-50">
  ...
</td>
```

---

## ナビゲーション追加

### レイアウトメニュー

```typescript
// /components/layout.tsx
const allMenuItems = [
  { id: 'dashboard', label: 'ダッシュボード', icon: Home, roles: ['system-admin', 'admin', 'user'] },
  { id: 'attendance', label: '勤怠入力', icon: Clock, roles: ['system-admin', 'admin', 'user'] },
  { id: 'work-schedule', label: '勤務表', icon: Calendar, roles: ['system-admin', 'admin', 'user'] },  // ✅ 追加
  ...
];
```

### ダッシュボードカード

```tsx
// /components/dashboard.tsx
<Card onClick={() => onNavigate('work-schedule')}>
  <CardHeader>
    <Calendar className="h-8 w-8 text-primary" />
    <CardTitle>勤務表</CardTitle>
    <CardDescription>
      月次の全スタッフ勤怠情報を確認
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Button>勤務表を見る</Button>
  </CardContent>
</Card>
```

---

## 使用例

### 1. 現在の月の勤務表を表示

1. ダッシュボードから「勤務表」カードをクリック
2. 現在の年月の勤務表が表示される

### 2. 前月のデータを確認

1. 勤務表画面で「前月」ボタンをクリック
2. 前月のデータが読み込まれる

### 3. 特定のスタッフのサマリーを確認

1. 勤務表の最下部のサマリー行を確認
2. 各スタッフの出勤日数、残業回数などが表示される

---

## テーブルレイアウト

### レスポンシブ対応

```tsx
<div className="overflow-x-auto">
  <table className="w-full border-collapse">
    ...
  </table>
</div>
```

横幅が足りない場合は横スクロールが可能です。

### 最小幅の指定

```tsx
<th className="min-w-[120px]">
  {staff.name}
</th>
```

各スタッフ列には最小幅120pxを指定しています。

---

## データフロー

### 初期ロード

```
1. コンポーネントマウント
   ↓
2. loadStaffList() - スタッフ一覧を取得
   ↓
3. loadMonthlyAttendance() - 月次勤怠データを取得
   ↓
4. データをStateに格納
   ↓
5. テーブルをレンダリング
```

### 月変更時

```
1. 「前月」または「次月」ボタンをクリック
   ↓
2. currentDateを更新
   ↓
3. useEffectがトリガーされる
   ↓
4. loadMonthlyAttendance() を再実行
   ↓
5. 新しい月のデータを取得
   ↓
6. テーブルを再レンダリング
```

---

## パフォーマンス最適化

### データ構造の最適化

スタッフID × 日付のマップを使用することで、O(1)でデータにアクセスできます：

```typescript
// ❌ 遅い（配列検索）
const attendance = allAttendance.find(att => 
  att.staffId === staffId && new Date(att.date).getDate() === day
);

// ✅ 速い（マップアクセス）
const attendance = attendanceData[staffId]?.[day];
```

### メモ化

将来的に以下を追加可能：

```typescript
const summary = useMemo(() => calculateSummary(staff.id), [attendanceData, staff.id]);
```

---

## アクセス権限

勤務表画面は**全ての権限**でアクセス可能です：

- ✅ システム管理者（`system-admin`）
- ✅ 管理者（`admin`）
- ✅ 一般ユーザー（`user`）

---

## エラーハンドリング

### データ取得失敗時

```typescript
try {
  const allAttendance = await attendanceApi.getByMonth(monthStr);
  // ...
} catch (error) {
  console.error('勤怠データの取得に失敗しました:', error);
  toast.error('勤怠データの取得に失敗しました');
}
```

### スタッフデータがない場合

```tsx
{staffList.length === 0 ? (
  <div className="text-center py-12 text-muted-foreground">
    <p>スタッフが登録されていません</p>
  </div>
) : (
  <table>...</table>
)}
```

---

## 将来の拡張

### 1. エクスポート機能

CSVまたはExcel形式でエクスポート：

```typescript
const exportToCSV = () => {
  // CSV生成ロジック
};
```

### 2. 印刷機能

勤務表を印刷可能なフォーマットで表示：

```typescript
const handlePrint = () => {
  window.print();
};
```

### 3. フィルタリング

特定の部署やスタッフのみ表示：

```typescript
const [selectedDepartment, setSelectedDepartment] = useState('all');
```

### 4. ソート機能

スタッフ名、社員番号などでソート：

```typescript
const sortedStaffList = staffList.sort((a, b) => 
  a.name.localeCompare(b.name)
);
```

---

## まとめ

### ✅ 実装完了

1. **勤務表画面の作成**
   - 年月選択機能
   - 全スタッフの勤怠情報を表形式で表示
   - 月次サマリーの表示

2. **API拡張**
   - `attendanceApi.getByMonth()` メソッドを追加

3. **ナビゲーション追加**
   - レイアウトメニューに追加
   - ダッシュボードカードに追加

4. **レスポンシブ対応**
   - 横スクロール対応
   - Sticky列（日付列）

---

## 画面遷移

```
ダッシュボード
  ↓
  [勤務表を見る] ボタン
  ↓
勤務表画面
  - 年月選択
  - 全スタッフの勤怠データ表示
  - サマリー表示
```

---

**実装日**: 2026年2月13日  
**影響範囲**:
- `/components/work-schedule-page.tsx` (新規作成)
- `/utils/api.ts` - `attendanceApi.getByMonth()` 追加
- `/App.tsx` - ルーティングに追加
- `/components/layout.tsx` - ナビゲーションに追加
- `/components/dashboard.tsx` - カード追加

**アクセス権限**: 全ユーザー（`system-admin`, `admin`, `user`）
