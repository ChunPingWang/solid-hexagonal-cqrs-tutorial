// ============================================================
// Command Handler - 建立訂單
// ============================================================
// CQRS 中的 Command Handler 負責處理「寫入」操作。
//
// SOLID 原則體現：
// - SRP: 此 Handler 只負責「建立訂單」這一個操作
// - OCP: 可透過新增新的 Handler 來擴展功能
// - DIP: 依賴抽象介面（Repository, EventPublisher, IdGenerator）
// ============================================================

import {
  CreateOrderUseCase,
  CreateOrderInput,
  CreateOrderOutput,
} from '../ports/input/CreateOrderUseCase';
import { OrderCommandRepository } from '../ports/output/OrderRepository';
import { EventPublisher } from '../ports/output/EventPublisher';
import { IdGenerator } from '../ports/output/IdGenerator';
import { Order } from '../../domain/models/Order';
import { OrderItem } from '../../domain/models/OrderItem';

export class CreateOrderHandler implements CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderCommandRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    // 1. 產生訂單 ID
    const orderId = this.idGenerator.generate();

    // 2. 建立訂單聚合根
    const order = Order.create(orderId, input.customerId);

    // 3. 新增訂單項目
    for (const item of input.items) {
      order.addItem(
        new OrderItem(item.productId, item.productName, item.unitPrice, item.quantity),
      );
    }

    // 4. 持久化訂單
    await this.orderRepository.save(order);

    // 5. 發布領域事件
    await this.eventPublisher.publishAll([...order.domainEvents]);
    order.clearEvents();

    // 6. 回傳結果
    return {
      orderId: order.id,
      totalAmount: order.totalAmount,
      status: order.status,
      itemCount: order.items.length,
    };
  }
}
