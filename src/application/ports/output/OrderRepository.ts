// ============================================================
// Output Port - 訂單儲存庫介面
// ============================================================
// Output Port 定義了應用程式核心需要從外部獲取的服務。
// 這是六角形架構中「被驅動端」(Driven Side) 的介面。
//
// 遵循 DIP（依賴反轉原則）：
//   應用層定義介面，基礎設施層提供實作。
//   高階模組不依賴低階模組，兩者都依賴抽象。
//
// 遵循 ISP（介面隔離原則）：
//   寫入儲存庫和讀取儲存庫被分離為不同介面，
//   這也正是 CQRS 的核心思想。
// ============================================================

import { Order } from '../../domain/models/Order';

/**
 * 命令端儲存庫（寫入）
 * CQRS - Command Side Repository
 */
export interface OrderCommandRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}

/**
 * 查詢端儲存庫（讀取）
 * CQRS - Query Side Repository
 */
export interface OrderReadModel {
  id: string;
  customerId: string;
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }>;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface OrderQueryRepository {
  findById(id: string): Promise<OrderReadModel | null>;
  findAll(): Promise<OrderReadModel[]>;
  findByCustomerId(customerId: string): Promise<OrderReadModel[]>;
}
