// ============================================================
// Input Port - 建立訂單用例介面
// ============================================================
// Input Port 定義了應用程式提供給外部世界的操作介面。
// 這是六角形架構中「驅動端」(Driving Side) 的介面。
//
// 遵循 DIP（依賴反轉原則）：
//   外部的 Controller/API 依賴此抽象介面，而非具體實作。
// 遵循 ISP（介面隔離原則）：
//   每個用例是獨立的介面，客戶端只依賴它需要的操作。
// ============================================================

export interface CreateOrderInput {
  customerId: string;
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
  }>;
}

export interface CreateOrderOutput {
  orderId: string;
  totalAmount: number;
  status: string;
  itemCount: number;
}

export interface CreateOrderUseCase {
  execute(input: CreateOrderInput): Promise<CreateOrderOutput>;
}
