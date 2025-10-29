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
function createErrorObject(error: unknown): Error {
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
