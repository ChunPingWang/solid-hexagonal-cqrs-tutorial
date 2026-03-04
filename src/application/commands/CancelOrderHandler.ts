// ============================================================
// Command Handler - 取消訂單
// ============================================================

import {
  CancelOrderUseCase,
  CancelOrderOutput,
} from '../ports/input/CancelOrderUseCase';
import { OrderCommandRepository } from '../ports/output/OrderRepository';
import { EventPublisher } from '../ports/output/EventPublisher';
import { OrderNotFoundError } from '../../domain/errors/DomainError';

export class CancelOrderHandler implements CancelOrderUseCase {
  constructor(
    private readonly orderRepository: OrderCommandRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(orderId: string, reason: string): Promise<CancelOrderOutput> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    order.cancel(reason);

    await this.orderRepository.save(order);
    await this.eventPublisher.publishAll([...order.domainEvents]);
    order.clearEvents();

    return {
      orderId: order.id,
      status: order.status,
      reason,
    };
  }
}
