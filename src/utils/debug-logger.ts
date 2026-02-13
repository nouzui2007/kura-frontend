// デバッグログを管理するシングルトン
class DebugLogger {
  private logs: Array<{ timestamp: string; level: string; message: string; data?: any }> = [];
  private listeners: Array<() => void> = [];
  private maxLogs = 100;

  // ログを追加
  log(level: 'info' | 'warn' | 'error' | 'success', message: string, data?: any) {
    const timestamp = new Date().toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });

    this.logs.push({ timestamp, level, message, data });

    // 最大ログ数を超えたら古いものから削除
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // リスナーに通知
    this.notifyListeners();

    // コンソールにも出力
    const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    logMethod(`[${timestamp}] ${message}`, data || '');
  }

  // 各レベルのヘルパーメソッド
  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  success(message: string, data?: any) {
    this.log('success', message, data);
  }

  // ログを取得
  getLogs() {
    return [...this.logs];
  }

  // ログをクリア
  clear() {
    this.logs = [];
    this.notifyListeners();
  }

  // リスナーを追加
  addListener(listener: () => void) {
    this.listeners.push(listener);
  }

  // リスナーを削除
  removeListener(listener: () => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // リスナーに通知
  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}

// シングルトンインスタンスをエクスポート
export const debugLogger = new DebugLogger();
