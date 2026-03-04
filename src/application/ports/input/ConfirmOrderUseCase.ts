// ============================================================
// Input Port - 確認訂單用例介面
// ============================================================
// 每個業務操作都有獨立的 Use Case 介面，
// 遵循 SRP（單一職責）和 ISP（介面隔離）。
// ============================================================

export interface ConfirmOrderOutput {
  orderId: string;
  status: string;
  totalAmount: number;
}

export interface ConfirmOrderUseCase {
  execute(orderId: string): Promise<ConfirmOrderOutput>;
}
