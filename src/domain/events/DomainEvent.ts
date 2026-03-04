// ============================================================
// Domain Events - 領域事件
// ============================================================
// 領域事件代表在領域中發生的重要事情。
// 這遵循了 OCP（開放封閉原則）：系統對擴展開放，
// 新的事件處理器可以被加入而不需修改現有的程式碼。
// ============================================================

/**
 * 所有領域事件的基礎介面
 * 遵循 ISP（介面隔離原則）：只定義事件所需的最小屬性
 */
export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredOn: Date;
  readonly aggregateId: string;
}

/**
 * 訂單已建立事件
 */
export class OrderCreatedEvent implements DomainEvent {
  readonly eventType = 'OrderCreated';
  readonly occurredOn: Date;
  readonly eventId: string;

  constructor(
    readonly aggregateId: string,
    readonly customerId: string,
    readonly totalAmount: number,
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}

/**
 * 訂單項目已新增事件
 */
export class OrderItemAddedEvent implements DomainEvent {
  readonly eventType = 'OrderItemAdded';
  readonly occurredOn: Date;
  readonly eventId: string;

  constructor(
    readonly aggregateId: string,
    readonly productId: string,
    readonly quantity: number,
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}

/**
 * 訂單已確認事件
 */
export class OrderConfirmedEvent implements DomainEvent {
  readonly eventType = 'OrderConfirmed';
  readonly occurredOn: Date;
  readonly eventId: string;

  constructor(readonly aggregateId: string) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}

/**
 * 訂單已取消事件
 */
export class OrderCancelledEvent implements DomainEvent {
  readonly eventType = 'OrderCancelled';
  readonly occurredOn: Date;
  readonly eventId: string;

  constructor(
    readonly aggregateId: string,
    readonly reason: string,
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
