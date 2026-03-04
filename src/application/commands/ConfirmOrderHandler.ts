// ============================================================
// Command Handler - 確認訂單
// ============================================================
// 遵循 SRP：只負責「確認訂單」這一個操作
// ============================================================

import {
  ConfirmOrderUseCase,
  ConfirmOrderOutput,
} from '../ports/input/ConfirmOrderUseCase';
import { OrderCommandRepository } from '../ports/output/OrderRepository';
import { EventPublisher } from '../ports/output/EventPublisher';
import { OrderNotFoundError } from '../../domain/errors/DomainError';

export class ConfirmOrderHandler implements ConfirmOrderUseCase {
  constructor(
    private readonly orderRepository: OrderCommandRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(orderId: string): Promise<ConfirmOrderOutput> {
    // 1. 從儲存庫取得訂單
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    // 2. 執行業務邏輯
    order.confirm();

    // 3. 持久化
    await this.orderRepository.save(order);

    // 4. 發布事件
    await this.eventPublisher.publishAll([...order.domainEvents]);
    order.clearEvents();

    return {
      orderId: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
    };
  }
}
