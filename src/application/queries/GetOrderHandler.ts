// ============================================================
// Query Handler - 查詢訂單
// ============================================================
// CQRS 中的 Query Handler 負責處理「讀取」操作。
// 它直接使用 Query Repository（讀取模型），
// 而非透過 Command Repository 讀取後轉換。
//
// 這是 CQRS 的關鍵優勢：
// - 讀取模型可以針對查詢場景優化（如非正規化的資料結構）
// - 讀寫分離後，各自可以獨立擴展
//
// 遵循 SRP：只負責查詢，不包含任何寫入邏輯
// 遵循 DIP：依賴 OrderQueryRepository 抽象介面
// ============================================================

import { GetOrderUseCase, OrderView } from '../ports/input/GetOrderUseCase';
import { ListOrdersUseCase } from '../ports/input/GetOrderUseCase';
import { OrderQueryRepository } from '../ports/output/OrderRepository';
import { OrderNotFoundError } from '../../domain/errors/DomainError';

export class GetOrderHandler implements GetOrderUseCase {
  constructor(private readonly queryRepository: OrderQueryRepository) {}

  async execute(orderId: string): Promise<OrderView> {
    const readModel = await this.queryRepository.findById(orderId);
    if (!readModel) {
      throw new OrderNotFoundError(orderId);
    }
    return {
      id: readModel.id,
      customerId: readModel.customerId,
      items: readModel.items,
      totalAmount: readModel.totalAmount,
      status: readModel.status,
      createdAt: readModel.createdAt,
    };
  }
}

export class ListOrdersHandler implements ListOrdersUseCase {
  constructor(private readonly queryRepository: OrderQueryRepository) {}

  async execute(customerId?: string): Promise<OrderView[]> {
    const readModels = customerId
      ? await this.queryRepository.findByCustomerId(customerId)
      : await this.queryRepository.findAll();

    return readModels.map((rm) => ({
      id: rm.id,
      customerId: rm.customerId,
      items: rm.items,
      totalAmount: rm.totalAmount,
      status: rm.status,
      createdAt: rm.createdAt,
    }));
  }
}
