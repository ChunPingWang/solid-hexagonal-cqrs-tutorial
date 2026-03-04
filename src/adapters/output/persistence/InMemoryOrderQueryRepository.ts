// ============================================================
// Driven Adapter - 記憶體版訂單查詢儲存庫
// ============================================================
// CQRS 查詢端的儲存庫實作。
// 在真實場景中，讀取模型通常儲存在優化過的資料庫中
// （如 Elasticsearch、Redis、非正規化的 SQL 視圖等）。
//
// 這個實作展示了 CQRS 的核心概念：
// 讀取模型是一個扁平化、非正規化的資料結構，
// 可以直接回傳給前端，無需額外轉換。
// ============================================================

import {
  OrderQueryRepository,
  OrderReadModel,
} from '../../../application/ports/output/OrderRepository';

export class InMemoryOrderQueryRepository implements OrderQueryRepository {
  private store = new Map<string, OrderReadModel>();

  /**
   * 同步讀取模型（當命令端儲存訂單時，同步更新讀取模型）
   * 在真實場景中，這通常透過事件驅動的方式異步更新
   */
  sync(readModel: OrderReadModel): void {
    this.store.set(readModel.id, readModel);
  }

  async findById(id: string): Promise<OrderReadModel | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<OrderReadModel[]> {
    return Array.from(this.store.values());
  }

  async findByCustomerId(customerId: string): Promise<OrderReadModel[]> {
    return Array.from(this.store.values()).filter(
      (order) => order.customerId === customerId,
    );
  }

  clear(): void {
    this.store.clear();
  }
}
