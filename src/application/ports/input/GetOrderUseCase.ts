// ============================================================
// Input Port - 查詢訂單用例介面
// ============================================================
// 這是 CQRS 中 Query（查詢）端的 Input Port。
// 將查詢與命令分離，各自可以獨立擴展和優化。
//
// 遵循 ISP：查詢介面與命令介面完全分離。
// ============================================================

export interface OrderItemView {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderView {
  id: string;
  customerId: string;
  items: OrderItemView[];
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface GetOrderUseCase {
  execute(orderId: string): Promise<OrderView>;
}

export interface ListOrdersUseCase {
  execute(customerId?: string): Promise<OrderView[]>;
}
