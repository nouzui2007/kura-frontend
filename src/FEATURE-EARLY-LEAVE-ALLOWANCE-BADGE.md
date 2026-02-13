# 早上手当バッジ表示機能の実装

## 概要

勤怠入力画面で、退勤時間が「早上がり基準時刻」より**大きい**場合に「**早上手当**」バッジを表示する機能を実装しました。この判定結果は勤怠データの`earlyLeave`フィールドに保存されます。

---

## 実装内容

### 1. `/utils/api.ts`

#### ✅ `Attendance`インターフェースに勤務分析結果を追加

```typescript
export interface Attendance {
  id?: string; // 勤怠データID（更新時に使用）
  date: string;
  staffId: string;
  startTime: string;
  endTime: string;
  workHours: number; // 実働時間（勤務時間 - 休憩時間）
  breakMinutes?: number; // 休憩時間（分）
  overtimeHours?: number; // 残業時間（表示のみ、APIには送らない）
  
  // 勤務分析結果 ✨
  earlyOvertime?: boolean; // 早出残業の有無
  overtime?: boolean; // 残業の有無
  earlyLeave?: boolean; // 早上がり（早上手当）の有無 ✨ NEW
  lateNightOvertimeHours?: number; // 深夜残業時間
}
```

**意味**:
- `earlyLeave: true` → 退勤時間が早上がり基準時刻より大きい（早上手当の対象）
- `earlyLeave: false` → 早上手当の対象外

---

### 2. `/components/time-entry-form.tsx`

#### ✅ バッジ表示を「早上手当」に変更

```typescript
{analysisResult.earlyLeave && (
  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
    <ChevronRight className="h-3 w-3 mr-1" />
    早上手当
  </Badge>
)}
```

**変更点**:
| 項目 | 修正前 | 修正後 |
|-----|-------|-------|
| バッジテキスト | 「早退あり」 | 「早上手当」 |
| バッジ色 | 黄色（警告） | 緑色（手当） |
| アイコン | `AlertCircle` | `ChevronRight` |

**理由**:
- 「早退」はネガティブな印象
- 「早上手当」はポジティブな手当として表示
- 緑色は手当・プラス要素を表現

---

### 3. `/components/attendance-page.tsx`

#### ✅ 保存処理（既に実装済み）

```typescript
// work-analysis APIを呼び出して勤務分析を実行
let analysisResult = null;
try {
  analysisResult = await workAnalysisApi.analyze({
    staffId: staff.id,
    workStartTime: staff.startTime,
    workEndTime: staff.endTime,
    date: dateKey,
  });
} catch (error) {
  console.error('勤務分析に失敗しました:', error);
}

// データを準備（work-analysis結果を含める）
const attendanceData = {
  date: dateKey,
  staffId: staff.id,
  startTime: staff.startTime,
  endTime: staff.endTime,
  workHours,
  breakMinutes: staff.breakMinutes || 0,
  // work-analysis結果を含める
  earlyOvertime: analysisResult?.earlyOvertime || false,
  overtime: analysisResult?.overtime || false,
  earlyLeave: analysisResult?.earlyLeave || false,  // ✨ 保存
  lateNightOvertimeHours: analysisResult?.lateNightOvertimeHours || 0,
};
```

#### ✅ 読み込み処理（既に実装済み）

```typescript
// データベースから勤務分析結果を復元
let analysisResult = undefined;
if (att.earlyOvertime !== undefined && att.earlyOvertime !== null || 
    att.overtime !== undefined && att.overtime !== null || 
    att.earlyLeave !== undefined && att.earlyLeave !== null ||  // ✨ 読み込み
    att.lateNightOvertimeHours !== undefined && att.lateNightOvertimeHours !== null) {
  analysisResult = {
    earlyOvertime: att.earlyOvertime || false,
    overtime: att.overtime || false,
    earlyLeave: att.earlyLeave || false,  // ✨ 復元
    lateNightOvertimeHours: att.lateNightOvertimeHours || 0,
  };
}
```

---

## 判定ロジック（work-analysis API）

### 判定基準

```
退勤時間 > 早上がり基準時刻
→ earlyLeave: true（早上手当の対象）
```

### 例

#### ケース1: 早上手当あり
```
システム設定:
- earlyLeaveStandardHour: 17時

勤怠データ:
- 出勤時間: 09:00
- 退勤時間: 18:00

判定:
- 18:00 > 17:00 → earlyLeave: true ✅
- バッジ: 「早上手当」（緑色）
```

#### ケース2: 早上手当なし
```
システム設定:
- earlyLeaveStandardHour: 17時

勤怠データ:
- 出勤時間: 09:00
- 退勤時間: 16:30

判定:
- 16:30 < 17:00 → earlyLeave: false
- バッジ: 表示なし
```

#### ケース3: 定時退勤
```
システム設定:
- earlyLeaveStandardHour: 17時

勤怠データ:
- 出勤時間: 09:00
- 退勤時間: 17:00

判定:
- 17:00 = 17:00 → earlyLeave: false
- バッジ: 表示なし
```

---

## データフロー

### 保存時

```
1. 勤怠入力画面で出勤・退勤時間を入力
   ↓
2. work-analysis APIを呼び出す
   ↓
3. APIが判定を実行
   - 退勤時間 > earlyLeaveStandardHour → earlyLeave: true
   ↓
4. 判定結果をバッジとして表示
   ↓
5. 「保存」ボタンをクリック
   ↓
6. attendanceテーブルにearlyLeave: trueを保存
```

### 読み込み時

```
1. 勤怠入力画面を開く
   ↓
2. attendanceテーブルから勤怠データを取得
   ↓
3. earlyLeaveフィールドを読み込み
   ↓
4. analysisResultとして復元
   ↓
5. earlyLeave: true の場合、バッジを表示
```

---

## UI表示

### バッジ一覧

| バッジ | 色 | アイコン | 表示条件 |
|-------|---|---------|---------|
| 早出残業あり | 紫色 | `Sun` | `earlyOvertime: true` |
| 残業あり | オレンジ色 | `Clock` | `overtime: true` |
| **早上手当** | **緑色** | **`ChevronRight`** | **`earlyLeave: true`** ✨ |
| 深夜残業: X時間 | 藍色 | `Moon` | `lateNightOvertimeHours > 0` |

### 画面イメージ

```
┌─────────────────────────────────────────┐
│ 山田 太郎                                │
│ 営業部 | ID: EMP001                      │
├─────────────────────────────────────────┤
│ [早出残業あり] [残業あり] [早上手当] 🎉  │ ← バッジ
│                                         │
│ 出勤時間: 08:00 AM                      │
│ 退勤時間: 06:00 PM                      │
│ 休憩時間: 60分                          │
│                                         │
│ 実働時間: 9時間0分                      │
│ 残業時間: 1時間0分                      │
└─────────────────────────────────────────┘
```

---

## データベースの状態

### attendanceテーブル

| フィールド | 型 | 例 | 説明 |
|-----------|---|---|------|
| `id` | UUID | `abc-123` | 勤怠データID |
| `date` | DATE | `2024-01-15` | 日付 |
| `staffId` | UUID | `staff-001` | スタッフID |
| `startTime` | TIME | `09:00` | 出勤時間 |
| `endTime` | TIME | `18:00` | 退勤時間 |
| `breakMinutes` | INTEGER | `60` | 休憩時間 |
| `workHours` | DECIMAL | `8.0` | 実働時間 |
| `earlyOvertime` | BOOLEAN | `false` | 早出残業 |
| `overtime` | BOOLEAN | `true` | 残業 |
| **`earlyLeave`** | **BOOLEAN** | **`true`** | **早上手当** ✨ |
| `lateNightOvertimeHours` | DECIMAL | `0.5` | 深夜残業時間 |

---

## 他の機能との連携

### 1. システム設定

```typescript
// システム設定から基準時刻を取得
{
  earlyLeaveStandardHour: 17  // 17時
}
```

### 2. work-analysis API

```typescript
// リクエスト
POST /work-analysis
{
  "staffId": "staff-001",
  "workStartTime": "09:00",
  "workEndTime": "18:00",
  "date": "2024-01-15"
}

// レスポンス
{
  "staffId": "staff-001",
  "date": "2024-01-15",
  "workStartTime": "09:00",
  "workEndTime": "18:00",
  "earlyOvertime": false,
  "overtime": true,
  "earlyLeave": true,  // ✨ 早上手当
  "lateNightOvertimeHours": 0
}
```

### 3. 給与計算

早上手当の判定結果を給与計算に活用できます：

```typescript
// 給与計算時に早上手当を加算
if (attendance.earlyLeave) {
  totalPay += earlyLeaveAllowance;  // 早上手当を加算
}
```

---

## テストケース

### ケース1: 早上手当あり（定時より遅い退勤）
```
入力:
- 出勤時間: 09:00
- 退勤時間: 18:00
- 早上がり基準時刻: 17:00

期待される結果:
- earlyLeave: true ✅
- バッジ: 「早上手当」（緑色）
- データベース: earlyLeave = true
```

### ケース2: 早上手当なし（定時より早い退勤）
```
入力:
- 出勤時間: 09:00
- 退勤時間: 16:30
- 早上がり基準時刻: 17:00

期待される結果:
- earlyLeave: false
- バッジ: 表示なし
- データベース: earlyLeave = false
```

### ケース3: 早上手当なし（定時退勤）
```
入力:
- 出勤時間: 09:00
- 退勤時間: 17:00
- 早上がり基準時刻: 17:00

期待される結果:
- earlyLeave: false
- バッジ: 表示なし
- データベース: earlyLeave = false
```

### ケース4: 複数バッジの同時表示
```
入力:
- 出勤時間: 08:00（早出残業）
- 退勤時間: 20:00（残業）
- 早上がり基準時刻: 17:00

期待される結果:
- earlyOvertime: true ✅
- overtime: true ✅
- earlyLeave: true ✅
- バッジ: [早出残業あり] [残業あり] [早上手当]
```

---

## メリット

### 1. **手当の見える化**
- 早上手当の対象かどうかが一目でわかる
- スタッフのモチベーション向上

### 2. **給与計算の正確性**
- 手当の判定が自動化
- 計算ミスの防止

### 3. **データの一貫性**
- 判定結果がデータベースに保存される
- 後から検証可能

### 4. **ユーザビリティ**
- 緑色のバッジでポジティブな印象
- 直感的にわかりやすい

---

## 注意事項

### 判定基準の理解

```
退勤時間 > 早上がり基準時刻 → 早上手当
```

この判定は、以下の意味を持ちます：

- **「早上がり基準時刻」より遅く退勤した場合、早上手当の対象**
- 例: 基準時刻が17時の場合、18時に退勤すると早上手当が付く

### 命名について

- フィールド名は`earlyLeave`
- 表示名は「早上手当」
- API側の判定基準に従っている

---

## まとめ

### ✅ 実装完了

1. **インターフェース追加**
   - `Attendance`に`earlyLeave`を追加

2. **バッジ表示**
   - 「早上手当」バッジを緑色で表示
   - アイコン: `ChevronRight`

3. **データ保存**
   - 勤怠データに`earlyLeave`を保存
   - work-analysis APIの判定結果を使用

4. **データ読み込み**
   - 既存データから`earlyLeave`を復元
   - バッジに反映

### 🎯 結果

- ✅ 退勤時間が早上がり基準時刻より大きい場合に「早上手当」バッジを表示
- ✅ 判定結果を勤怠データに保存
- ✅ 保存・読み込み処理が正常に動作
- ✅ work-analysis APIとの連携完了

---

**実装日**: 2026年2月13日  
**影響範囲**: 
- `/utils/api.ts`
- `/components/time-entry-form.tsx`
- `/components/attendance-page.tsx` (確認のみ、既に実装済み)

**APIとの連携**: 完了（work-analysis APIが判定を実行）
