// ============================================================
// Input Port - 取消訂單用例介面
// ============================================================

export interface CancelOrderOutput {
  orderId: string;
  status: string;
  reason: string;
}

export interface CancelOrderUseCase {
  execute(orderId: string, reason: string): Promise<CancelOrderOutput>;
}
