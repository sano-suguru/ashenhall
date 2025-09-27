/**
 * エラーハンドリング統一システム
 * 
 * 設計方針:
 * - 33箇所で散在するエラー処理を統一
 * - 型安全なエラー処理とログ記録
 * - React状態管理との統合
 */

/**
 * エラーオブジェクトを標準化
 */
export function createErrorObject(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return new Error('Unknown error occurred');
}

/**
 * エラーログ記録（コンソールログ統一）
 */
export function logError(context: string, error: unknown, setState?: (error: Error) => void): void {
  const errorObj = createErrorObject(error);
  const message = `${context}: ${errorObj.message}`;
  
  console.error(message);
  
  if (setState) {
    setState(errorObj);
  }
}

/**
 * 警告ログ記録
 */
export function logWarning(message: string): void {
  console.warn(message);
}

/**
 * ゲームイベントログ記録（開発・デバッグ用）
 */
export function logGameEvent(event: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Game Event] ${event}`, data || '');
  }
}

/**
 * 統計データ読み込みエラーハンドリング
 */
export function handleStatsLoadError(error: unknown, setErrorState?: (error: Error) => void): void {
  logError('Failed to load stats', error, setErrorState);
}

/**
 * 統計データ保存エラーハンドリング
 */
export function handleStatsSaveError(error: unknown, setErrorState?: (error: Error) => void): void {
  logError('Failed to save stats', error, setErrorState);
}

/**
 * デッキコード関連エラーハンドリング
 */
export function handleDeckCodeError(error: unknown, message: string): void {
  console.error(message);
  console.error('Failed to decode deck code:', error);
}

/**
 * 統一エラーハンドリング関数（try-catchブロック用）
 */
export function withErrorHandling<T>(
  operation: () => T,
  context: string,
  setErrorState?: (error: Error) => void
): T | null {
  try {
    return operation();
  } catch (error) {
    logError(context, error, setErrorState);
    return null;
  }
}

/**
 * 非同期エラーハンドリング関数
 */
export async function withAsyncErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  setErrorState?: (error: Error) => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    logError(context, error, setErrorState);
    return null;
  }
}
