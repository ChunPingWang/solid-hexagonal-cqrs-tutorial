// ============================================================
// Order Aggregate Root - 訂單聚合根
// ============================================================
// 聚合根是 DDD 的核心概念，它是一個實體，負責維護
// 聚合邊界內的資料一致性。
//
// SOLID 原則體現：
// - SRP: Order 只負責訂單的業務邏輯
// - OCP: 可透過新增事件類型來擴展行為，而不修改現有邏輯
// - LSP: Order 的所有狀態轉換都保持一致的行為契約
// ============================================================

import { OrderItem } from './OrderItem';
import {
  DomainEvent,
  OrderCreatedEvent,
  OrderItemAddedEvent,
  OrderConfirmedEvent,
  OrderCancelledEvent,
} from '../events/DomainEvent';
import { InvalidOrderOperationError } from '../errors/DomainError';

export enum OrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export class Order {
  private _items: OrderItem[] = [];
  private _status: OrderStatus = OrderStatus.DRAFT;
  private _domainEvents: DomainEvent[] = [];

  constructor(
    readonly id: string,
    readonly customerId: string,
    private _createdAt: Date = new Date(),
  ) {
    if (!id || id.trim() === '') {
      throw new InvalidOrderOperationError('訂單 ID 不能為空');
    }
    if (!customerId || customerId.trim() === '') {
      throw new InvalidOrderOperationError('客戶 ID 不能為空');
    }
  }

  // ---- 查詢方法（Query）----

  get items(): ReadonlyArray<OrderItem> {
    return [...this._items];
  }

  get status(): OrderStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get totalAmount(): number {
    return this._items.reduce((sum, item) => sum + item.subtotal, 0);
  }

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return [...this._domainEvents];
  }

  // ---- 指令方法（Command）----

  /**
   * 新增訂單項目
   * 只能在 DRAFT 狀態下新增
   */
  addItem(item: OrderItem): void {
    if (this._status !== OrderStatus.DRAFT) {
      throw new InvalidOrderOperationError(
        `無法在 ${this._status} 狀態下新增項目`,
      );
    }
    this._items.push(item);
    this._domainEvents.push(
      new OrderItemAddedEvent(this.id, item.productId, item.quantity),
    );
  }

  /**
   * 確認訂單
   * 必須至少有一個項目才能確認
   */
  confirm(): void {
    if (this._status !== OrderStatus.DRAFT) {
      throw new InvalidOrderOperationError(
        `無法從 ${this._status} 狀態確認訂單`,
      );
    }
    if (this._items.length === 0) {
      throw new InvalidOrderOperationError('訂單必須至少有一個項目才能確認');
    }
    this._status = OrderStatus.CONFIRMED;
    this._domainEvents.push(new OrderConfirmedEvent(this.id));
  }

  /**
   * 取消訂單
   * 只能取消 DRAFT 或 CONFIRMED 狀態的訂單
   */
  cancel(reason: string): void {
    if (this._status === OrderStatus.CANCELLED) {
      throw new InvalidOrderOperationError('訂單已經被取消');
    }
    this._status = OrderStatus.CANCELLED;
    this._domainEvents.push(new OrderCancelledEvent(this.id, reason));
  }

  /**
   * 清除已發布的領域事件
   */
  clearEvents(): void {
    this._domainEvents = [];
  }

  // ---- 工廠方法 ----

  /**
   * 建立新訂單的工廠方法
   */
  static create(id: string, customerId: string): Order {
    const order = new Order(id, customerId);
    order._domainEvents.push(
      new OrderCreatedEvent(id, customerId, 0),
    );
    return order;
  }

  /**
   * 從持久化資料重建訂單（不觸發事件）
   */
  static reconstruct(
    id: string,
    customerId: string,
    items: OrderItem[],
    status: OrderStatus,
    createdAt: Date,
  ): Order {
    const order = new Order(id, customerId, createdAt);
    order._items = [...items];
    order._status = status;
    return order;
  }
}
