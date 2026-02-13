# システム設定保存時の重複エラーを修正

## 問題

システム設定画面で「設定を保存」ボタンをクリックすると、以下のエラーが発生していました：

```
duplicate key value violates unique constraint
```

## 原因

システム設定の保存処理が**新規作成（POST）**になっていたため、既に存在するレコードに対して再度POSTすると重複エラーが発生していました。

### 修正前のコード

```typescript
// システム設定を保存
async save(settings: SystemSettings): Promise<boolean> {
  const result = await apiRequest<any>(
    "/system-settings",
    {
      method: "POST",  // ❌ 常に新規作成
      body: JSON.stringify(settings),
    },
    "システム設定の保存に失敗しました",
  );
  return !!result;
}
```

**問題点:**
- 常に`POST`メソッドを使用
- 既存データの確認を行わない
- 2回目以降の保存で必ず重複エラー

---

## 解決策

システム設定は通常**1件のみ**存在するため、以下のロジックに変更しました：

1. **既存データを確認**
2. **既存データがある場合 → 更新（PATCH）**
3. **既存データがない場合 → 新規作成（POST）**

### 修正後のコード

```typescript
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
    // 更新処理（PATCH） ✅
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
}
```

---

## 処理フロー

### 初回保存時（データなし）

```
1. GET /system-settings を呼び出す
   ↓
2. データが存在しない
   ↓
3. POST /system-settings で新規作成 ✅
   ↓
4. 保存成功
```

### 2回目以降の保存時（データあり）

```
1. GET /system-settings を呼び出す
   ↓
2. 既存データを取得（IDを含む）
   ↓
3. PATCH /system-settings/{id} で更新 ✅
   ↓
4. 更新成功
```

---

## 修正内容

### ファイル: `/utils/api.ts`

#### ✅ 変更箇所

| 項目 | 修正前 | 修正後 |
|-----|-------|-------|
| メソッド | 常にPOST | 既存データがあればPATCH、なければPOST |
| エンドポイント | `/system-settings` | `/system-settings/{id}` (更新時) |
| エラーメッセージ | 「保存に失敗」 | 「更新に失敗」/「作成に失敗」（状況に応じて） |

---

## テストケース

### ケース1: 初回保存
```
前提: データベースにシステム設定が存在しない

操作:
1. システム設定画面で値を変更
2. 「設定を保存」をクリック

期待される結果:
✅ POST /system-settings が実行される
✅ 新規レコードが作成される
✅ 「システム設定を保存しました」トーストが表示される
```

### ケース2: 2回目以降の保存
```
前提: データベースにシステム設定が既に存在する（id: "abc-123"）

操作:
1. システム設定画面で値を変更
2. 「設定を保存」をクリック

期待される結果:
✅ GET /system-settings が実行される
✅ 既存データのIDを取得（"abc-123"）
✅ PATCH /system-settings/abc-123 が実行される
✅ 既存レコードが更新される
✅ 「システム設定を保存しました」トーストが表示される
❌ 重複エラーが発生しない
```

### ケース3: 連続保存
```
前提: データベースにシステム設定が既に存在する

操作:
1. システム設定画面で値を変更
2. 「設定を保存」をクリック
3. 再度値を変更
4. 「設定を保存」をクリック
5. 再度値を変更
6. 「設定を保存」をクリック

期待される結果:
✅ すべての保存が成功する
❌ 重複エラーが発生しない
```

---

## エラーハンドリング

### パターン1: 既存データ取得失敗

```typescript
// GET /system-settings が失敗した場合
→ 既存データがnullとして扱われる
→ POST /system-settings で新規作成を試行
```

### パターン2: 更新失敗

```typescript
// PATCH /system-settings/{id} が失敗した場合
→ エラーメッセージ: 「システム設定の更新に失敗しました」
→ トーストでユーザーに通知
→ 保存処理は中断
```

### パターン3: 新規作成失敗

```typescript
// POST /system-settings が失敗した場合
→ エラーメッセージ: 「システム設定の作成に失敗しました」
→ トーストでユーザーに通知
→ 保存処理は中断
```

---

## データ形式

### GET /system-settings のレスポンス例

**パターン1: 配列で返る**
```json
[
  {
    "id": "abc-123",
    "regularHoursPerDay": 8,
    "defaultBreakMinutes": 60,
    "earlyLeaveStandardHour": 17,
    ...
  }
]
```

**パターン2: オブジェクトで返る**
```json
{
  "id": "abc-123",
  "regularHoursPerDay": 8,
  "defaultBreakMinutes": 60,
  "earlyLeaveStandardHour": 17,
  ...
}
```

**パターン3: データなし**
```json
[]
```

### PATCH /system-settings/{id} のリクエスト

```json
{
  "regularHoursPerDay": 8,
  "defaultBreakMinutes": 60,
  "breakMinutesFor6Hours": 45,
  "breakMinutesFor8Hours": 60,
  "overtimeThreshold": 45,
  "overtimeRate": 25,
  "excessOvertimeRate": 50,
  "lateNightRate": 25,
  "holidayRate": 35,
  "lateNightStartHour": 22,
  "lateNightEndHour": 5,
  "earlyOvertimeStandardHour": 9,
  "earlyLeaveStandardHour": 17,
  "defaultHourlyRate": 1200
}
```

---

## メリット

### 1. **重複エラーの完全解決**
- 既存データを確認してから保存するため、重複エラーが発生しない

### 2. **正しいHTTPメソッド**
- 新規作成: POST
- 更新: PATCH
- RESTfulな設計に準拠

### 3. **柔軟性**
- 初回保存でも2回目以降の保存でも同じメソッドで対応
- データベースの状態に応じて自動的に適切な処理を実行

### 4. **エラーメッセージの明確化**
- 「作成に失敗」と「更新に失敗」を区別
- デバッグが容易

---

## パフォーマンスへの影響

### API呼び出し回数

| 処理 | 修正前 | 修正後 |
|-----|-------|-------|
| 初回保存 | 1回（POST） | 2回（GET + POST） |
| 2回目以降 | 1回（POST → エラー） | 2回（GET + PATCH） |

**影響**: 軽微
- 追加のGETリクエストは軽量（設定データは1件のみ）
- システム設定の保存は頻繁に行われる操作ではない
- エラーを回避できるメリットの方が大きい

---

## 他のAPIとの比較

### スタッフマスター（staff API）

```typescript
// 新規作成
staffApi.create(staff);  // POST /staff

// 更新
staffApi.update(staff);  // PATCH /staff/{id}
```

**違い**: スタッフは複数存在するため、新規/更新を明示的に区別

### システム設定（systemSettings API）

```typescript
// 新規 or 更新（自動判定）
systemSettingsApi.save(settings);
```

**特徴**: システム設定は1件のみなので、内部で自動判定

---

## まとめ

### ✅ 修正完了

1. **既存データの確認処理を追加**
   - GET /system-settings でIDを取得

2. **適切なHTTPメソッドを使用**
   - 既存データあり → PATCH（更新）
   - 既存データなし → POST（新規作成）

3. **エラーメッセージの改善**
   - 「更新に失敗」と「作成に失敗」を区別

### 🎯 結果

- ❌ 重複エラー（duplicate key value violates）が発生しない
- ✅ 何度でも設定を保存できる
- ✅ RESTfulな設計に準拠
- ✅ エラーハンドリングの向上

---

**修正日**: 2026年2月13日  
**影響範囲**: `/utils/api.ts` - `systemSettingsApi.save()`  
**関連ファイル**: `/components/system-settings-page.tsx`
