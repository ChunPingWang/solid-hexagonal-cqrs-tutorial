// ============================================================
// Domain Errors - 領域錯誤
// ============================================================
// 使用專屬的錯誤類別而非通用 Error，遵循了：
// - SRP：每個錯誤類別只負責描述一種錯誤情境
// - LSP：所有領域錯誤都可以替代基礎 DomainError 使用
// ============================================================

/**
 * 領域錯誤基礎類別
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * 訂單找不到
 */
export class OrderNotFoundError extends DomainError {
  constructor(orderId: string) {
    super(`找不到訂單: ${orderId}`);
  }
}

/**
 * 無效的訂單操作
 */
export class InvalidOrderOperationError extends DomainError {
  constructor(message: string) {
    super(`無效的訂單操作: ${message}`);
  }
}

/**
 * 無效的訂單項目
 */
export class InvalidOrderItemError extends DomainError {
  constructor(message: string) {
    super(`無效的訂單項目: ${message}`);
  }
}
