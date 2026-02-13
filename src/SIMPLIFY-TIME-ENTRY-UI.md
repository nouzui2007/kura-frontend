# 勤怠入力画面の表示簡素化

## 概要

勤怠入力画面から**休憩時間の表示・入力フィールド**、**実働時間の表示**、**残業時間の表示**を削除しました。ただし、**データ保存は引き続き実行されます**。

---

## 修正内容

### 1. `/components/time-entry-form.tsx`

#### ✅ 削除した表示要素

1. **残業時間の説明アラート**
   ```typescript
   // ❌ 削除
   <Alert>
     <AlertDescription>
       <strong>残業時間の計算:</strong> 実働時間（勤務時間 - 休憩時間）が{systemSettings.regularHoursPerDay}時間を超えた分が残業時間として自動計算されます。
     </AlertDescription>
   </Alert>
   ```

2. **休憩時間の入力フィールド**
   ```typescript
   // ❌ 削除
   <div className="mb-3">
     <Label>休憩時間（分）</Label>
     <Input
       type="number"
       value={staff.breakMinutes || 0}
       onChange={(e) => updateBreakMinutes(staff.id, parseInt(e.target.value) || 0)}
     />
     <p>※ 法定：6時間超で45分、8時間超で60分の休憩が必要です</p>
   </div>
   ```

3. **実働時間の表示**
   ```typescript
   // ❌ 削除
   <div className="flex justify-between items-center p-2 bg-blue-50 rounded-md">
     <span>実働時間:</span>
     <span>{actualWorkTime}</span>
   </div>
   ```

4. **残業時間の表示**
   ```typescript
   // ❌ 削除
   {overtimeHours !== '--' && overtimeHours !== '0時間' && (
     <div className="flex justify-between items-center p-2 bg-orange-50 border border-orange-200 rounded-md">
       <span>残業時間:</span>
       <span>{overtimeHours}</span>
     </div>
   )}
   ```

5. **計算関数（未使用の関数を削除）**
   - `calculateActualWorkTime` - 実働時間の計算
   - `calculateOvertimeHours` - 残業時間の計算
   - `getTotalWorkTime` - 合計勤務時間の計算

6. **未使用のインポート**
   ```typescript
   // ❌ 削除
   import { Input } from './ui/input';
   import { Coffee } from 'lucide-react';
   ```

#### ✅ 保持した機能

1. **データ保存のための`updateBreakMinutes`関数**
   ```typescript
   // ✅ 保持（データ保存のため）
   const updateBreakMinutes = (id: string, minutes: number) => {
     const staff = workingStaffList.find(s => s.id === id);
     if (staff) {
       onUpdateStaff({ ...staff, breakMinutes: minutes });
     }
   };
   ```
   ※ 現在は使用されていませんが、将来的に必要になる可能性があるため保持

2. **勤務分析結果のバッジ表示**
   - 早出残業あり
   - 残業あり
   - 早上手当
   - 深夜残業

3. **出勤時間・退勤時間の入力**

---

## データ保存の動作

### 保存されるデータ

勤怠データ保存時、以下の情報がデータベースに保存されます：

```typescript
const attendanceData = {
  date: dateKey,
  staffId: staff.id,
  startTime: staff.startTime,
  endTime: staff.endTime,
  workHours,                       // ✅ 実働時間（計算済み）
  breakMinutes: staff.breakMinutes || 0,  // ✅ 休憩時間
  // work-analysis結果
  earlyOvertime: analysisResult?.earlyOvertime || false,
  overtime: analysisResult?.overtime || false,
  earlyLeave: analysisResult?.earlyLeave || false,
  lateNightOvertimeHours: analysisResult?.lateNightOvertimeHours || 0,
};
```

---

## デフォルト値の設定

### 1. 新規スタッフ追加時

`staff-selector.tsx`で新規スタッフを追加する際、デフォルトの休憩時間が設定されます：

```typescript
const newWorkingStaff: WorkingStaff = {
  ...masterStaff,
  startTime: '',
  endTime: '',
  breakMinutes: 60,  // ✅ デフォルト60分
  isSelected: true
};
```

### 2. 既存データ読み込み時

`attendance-page.tsx`で既存データを読み込む際、システム設定のデフォルト値が使用されます：

```typescript
return {
  // ...
  breakMinutes: att.breakMinutes || systemSettings.defaultBreakMinutes,  // ✅ システム設定のデフォルト値
  // ...
};
```

---

## 実働時間と残業時間の計算

### 計算は引き続き実行されます

表示は削除されましたが、**データ保存時に実働時間は計算されます**：

```typescript
// attendance-page.tsx
const totalMinutes = calculateWorkMinutes(staff.startTime, staff.endTime);
const workHours = Math.max(0, (totalMinutes - (staff.breakMinutes || 0)) / 60);  // ✅ 実働時間を計算
```

**計算式**:
```
実働時間 = (退勤時間 - 出勤時間) - 休憩時間
```

---

## UI の変更

### 修正前

```
┌────────────────────────────────────┐
│ 山田 太郎                           │
│ 営業部 | ID: EMP001                 │
├────────────────────────────────────┤
│ [早出残業あり] [残業あり]          │
│                                    │
│ 出勤時間: 9:00 AM                  │
│ 退勤時間: 6:00 PM                  │
│                                    │
│ 休憩時間（分）                     │ ← ❌ 削除
│ [  60  ]                           │ ← ❌ 削除
│ ※ 法定：6時間超で45分...           │ ← ❌ 削除
│                                    │
│ 実働時間: 8時間0分                 │ ← ❌ 削除
│ 残業時間: 1時間0分                 │ ← ❌ 削除
└────────────────────────────────────┘
```

### 修正後

```
┌────────────────────────────────────┐
│ 山田 太郎                           │
│ 営業部 | ID: EMP001                 │
├────────────────────────────────────┤
│ [早出残業あり] [残業あり]          │
│                                    │
│ 出勤時間: 9:00 AM                  │
│ 退勤時間: 6:00 PM                  │
└────────────────────────────────────┘
```

---

## メリット

### 1. **シンプルな UI**
- 入力項目が減り、画面がすっきり
- 出勤・退勤時間の入力に集中できる

### 2. **入力ミスの削減**
- 休憩時間の入力ミスを防止
- システムが自動的にデフォルト値を使用

### 3. **操作の簡略化**
- 必要最小限の情報のみ表示
- スタッフの負担を軽減

### 4. **データの一貫性**
- 休憩時間はシステム設定に統一
- 計算ロジックは変更なし

---

## データフロー

### 新規スタッフ追加時

```
1. スタッフ選択
   ↓
2. WorkingStaff作成（breakMinutes: 60）
   ↓
3. 出勤・退勤時間を入力
   ↓
4. 保存ボタンをクリック
   ↓
5. 実働時間を計算（退勤 - 出勤 - 休憩）
   ↓
6. データベースに保存
   - startTime: "09:00"
   - endTime: "18:00"
   - breakMinutes: 60
   - workHours: 8.0
```

### 既存データ読み込み時

```
1. 日付選択
   ↓
2. attendanceテーブルから取得
   ↓
3. breakMinutesを復元（デフォルト値使用）
   ↓
4. 画面に表示（休憩時間は非表示）
   ↓
5. 出勤・退勤時間を修正
   ↓
6. 保存時に実働時間を再計算
   ↓
7. データベースを更新
```

---

## データベースのスキーマ

### attendanceテーブル

| フィールド | 型 | 説明 | 保存の有無 |
|-----------|---|------|----------|
| `date` | DATE | 日付 | ✅ 保存 |
| `staffId` | UUID | スタッフID | ✅ 保存 |
| `startTime` | TIME | 出勤時間 | ✅ 保存 |
| `endTime` | TIME | 退勤時間 | ✅ 保存 |
| `breakMinutes` | INTEGER | 休憩時間 | ✅ 保存（非表示） |
| `workHours` | DECIMAL | 実働時間 | ✅ 保存（計算済み） |
| `earlyOvertime` | BOOLEAN | 早出残業 | ✅ 保存 |
| `overtime` | BOOLEAN | 残業 | ✅ 保存 |
| `earlyLeave` | BOOLEAN | 早上手当 | ✅ 保存 |
| `lateNightOvertimeHours` | DECIMAL | 深夜残業時間 | ✅ 保存 |

**重要**: `breakMinutes`と`workHours`は引き続きデータベースに保存されますが、**UIには表示されません**。

---

## システム設定

### デフォルト休憩時間

システム設定画面で設定されたデフォルト休憩時間が使用されます：

```typescript
// system_settingsテーブル
{
  defaultBreakMinutes: 60  // デフォルト60分
}
```

このデフォルト値は以下の場面で使用されます：
1. 既存データの`breakMinutes`が`null`または`undefined`の場合
2. 新規スタッフ追加時（ハードコード: 60分）

---

## 注意事項

### 1. 休憩時間の変更

現在、UIから休憩時間を変更することはできません。休憩時間を変更する必要がある場合は、以下のいずれかの方法を使用してください：

- **方法1**: データベースを直接更新
- **方法2**: システム設定のデフォルト値を変更
- **方法3**: 将来的に管理者向けの設定画面を追加

### 2. 実働時間の計算

実働時間は自動計算されます。手動での調整はできません：

```
実働時間 = (退勤時間 - 出勤時間) - 休憩時間
```

### 3. 給与計算への影響

給与計算APIは引き続き`workHours`と`breakMinutes`を使用します。データ保存は継続されているため、**給与計算に影響はありません**。

---

## テストケース

### ケース1: 新規スタッフの勤怠入力

```
操作:
1. スタッフ「山田 太郎」を選択
2. 出勤時間: 09:00 AM
3. 退勤時間: 06:00 PM
4. 保存ボタンをクリック

期待される結果:
- データベースに保存:
  - startTime: "09:00"
  - endTime: "18:00"
  - breakMinutes: 60 ✅
  - workHours: 8.0 ✅
- UI表示:
  - 出勤時間: 9:00 AM ✅
  - 退勤時間: 6:00 PM ✅
  - 休憩時間: 非表示 ✅
  - 実働時間: 非表示 ✅
  - 残業時間: 非表示 ✅
```

### ケース2: 既存データの読み込み

```
前提条件:
- データベースに以下のデータが存在:
  - startTime: "09:00"
  - endTime: "18:00"
  - breakMinutes: 60
  - workHours: 8.0

操作:
1. 勤怠入力画面を開く
2. 日付を選択

期待される結果:
- UI表示:
  - 出勤時間: 9:00 AM ✅
  - 退勤時間: 6:00 PM ✅
  - 休憩時間: 非表示 ✅
  - 実働時間: 非表示 ✅
  - 残業時間: 非表示 ✅
- データ:
  - breakMinutes: 60（内部的に保持）✅
```

### ケース3: 時間変更後の保存

```
前提条件:
- 既存データ: startTime="09:00", endTime="18:00", breakMinutes=60

操作:
1. 退勤時間を「6:00 PM」→「7:00 PM」に変更
2. 保存ボタンをクリック

期待される結果:
- データベースを更新:
  - startTime: "09:00"
  - endTime: "19:00" ✅
  - breakMinutes: 60（変更なし）✅
  - workHours: 9.0（再計算）✅
```

---

## まとめ

### ✅ 修正完了

1. **UI から削除**
   - 休憩時間の表示・入力フィールド
   - 実働時間の表示
   - 残業時間の表示
   - 残業時間の説明アラート

2. **データ保存は継続**
   - `breakMinutes`（デフォルト60分）
   - `workHours`（自動計算）
   - その他の勤怠情報

3. **保持した機能**
   - 出勤・退勤時間の入力
   - 勤務分析結果のバッジ表示
   - データベースへの保存処理

### 🎯 結果

- ✅ UI がシンプルになり、操作が簡単に
- ✅ データ保存は引き続き正常に動作
- ✅ 給与計算への影響なし
- ✅ システムの一貫性を維持

---

**実装日**: 2026年2月13日  
**影響範囲**: 
- `/components/time-entry-form.tsx` - UI から表示を削除
- `/components/attendance-page.tsx` - データ保存は継続（変更なし）
- `/components/staff-selector.tsx` - デフォルト値の設定（変更なし）

**データベース**: 変更なし（`breakMinutes`と`workHours`は引き続き保存）
