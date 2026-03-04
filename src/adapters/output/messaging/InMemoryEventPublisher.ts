// ============================================================
// Driven Adapter - 記憶體版事件發布者
// ============================================================
// EventPublisher Output Port 的具體實作。
// 在真實場景中，這會被替換為 Kafka、RabbitMQ 等訊息佇列。
//
// 遵循 OCP：新增事件類型時，此類別不需要修改。
// 遵循 LSP：可被任何其他 EventPublisher 實作替換。
//
// 此實作同時負責將寫入模型同步到讀取模型，
// 展示了 CQRS 中事件驅動的讀寫同步機制。
// ============================================================

import { DomainEvent } from '../../../domain/events/DomainEvent';
import { EventPublisher } from '../../../application/ports/output/EventPublisher';
import { InMemoryOrderQueryRepository } from '../persistence/InMemoryOrderQueryRepository';
import { InMemoryOrderCommandRepository } from '../persistence/InMemoryOrderCommandRepository';
import { OrderReadModel } from '../../../application/ports/output/OrderRepository';

export class InMemoryEventPublisher implements EventPublisher {
  private publishedEvents: DomainEvent[] = [];

  constructor(
    private readonly commandRepo: InMemoryOrderCommandRepository,
    private readonly queryRepo: InMemoryOrderQueryRepository,
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
    await this.syncReadModel(event.aggregateId);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * 同步讀取模型：將命令端的資料轉換為讀取模型
   * 在真實系統中，這會是一個獨立的事件處理器（Projector）
   */
  private async syncReadModel(orderId: string): Promise<void> {
    const order = await this.commandRepo.findById(orderId);
    if (!order) return;

    const readModel: OrderReadModel = {
      id: order.id,
      customerId: order.customerId,
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    };

    this.queryRepo.sync(readModel);
  }

  // 測試輔助方法
  getPublishedEvents(): ReadonlyArray<DomainEvent> {
    return [...this.publishedEvents];
  }

  clear(): void {
    this.publishedEvents = [];
  }
}
