// ============================================================
// Output Port - 事件發布者介面
// ============================================================
// 遵循 DIP：應用層定義事件發布的抽象介面，
// 具體的訊息佇列（Kafka, RabbitMQ 等）實作在 Adapter 層。
//
// 遵循 OCP：新增事件類型時，不需要修改發布者介面。
// ============================================================

import { DomainEvent } from '../../domain/events/DomainEvent';

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}
