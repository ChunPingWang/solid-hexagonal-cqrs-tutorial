// ============================================================
// 領域模型測試
// ============================================================
// 領域模型不依賴任何外部框架或基礎設施，
// 因此可以用純粹的單元測試來驗證。
// 這是六角形架構的核心優勢之一。
// ============================================================

import { Order, OrderStatus } from '../../src/domain/models/Order';
import { OrderItem } from '../../src/domain/models/OrderItem';
import { Product } from '../../src/domain/models/Product';
import { InvalidOrderOperationError, InvalidOrderItemError } from '../../src/domain/errors/DomainError';

describe('Product（產品值物件）', () => {
  it('應該能建立有效的產品', () => {
    const product = new Product('p1', '鍵盤', 2500);
    expect(product.id).toBe('p1');
    expect(product.name).toBe('鍵盤');
    expect(product.price).toBe(2500);
  });

  it('空 ID 應該拋出錯誤', () => {
    expect(() => new Product('', '鍵盤', 2500)).toThrow('產品 ID 不能為空');
  });

  it('空名稱應該拋出錯誤', () => {
    expect(() => new Product('p1', '', 2500)).toThrow('產品名稱不能為空');
  });

  it('負價格應該拋出錯誤', () => {
    expect(() => new Product('p1', '鍵盤', -100)).toThrow('產品價格不能為負數');
  });
});

describe('OrderItem（訂單項目值物件）', () => {
  it('應該正確計算小計', () => {
    const item = new OrderItem('p1', '鍵盤', 2500, 3);
    expect(item.subtotal).toBe(7500);
  });

  it('數量為 0 應該拋出錯誤', () => {
    expect(() => new OrderItem('p1', '鍵盤', 2500, 0)).toThrow(InvalidOrderItemError);
  });

  it('負數量應該拋出錯誤', () => {
    expect(() => new OrderItem('p1', '鍵盤', 2500, -1)).toThrow(InvalidOrderItemError);
  });

  it('空產品 ID 應該拋出錯誤', () => {
    expect(() => new OrderItem('', '鍵盤', 2500, 1)).toThrow(InvalidOrderItemError);
  });
});

describe('Order（訂單聚合根）', () => {
  let order: Order;

  beforeEach(() => {
    order = Order.create('order-1', 'customer-1');
  });

  describe('建立', () => {
    it('應該能用工廠方法建立訂單', () => {
      expect(order.id).toBe('order-1');
      expect(order.customerId).toBe('customer-1');
      expect(order.status).toBe(OrderStatus.DRAFT);
      expect(order.items).toHaveLength(0);
      expect(order.totalAmount).toBe(0);
    });

    it('應該產生 OrderCreated 事件', () => {
      expect(order.domainEvents).toHaveLength(1);
      expect(order.domainEvents[0].eventType).toBe('OrderCreated');
    });

    it('空訂單 ID 應該拋出錯誤', () => {
      expect(() => Order.create('', 'customer-1')).toThrow(InvalidOrderOperationError);
    });

    it('空客戶 ID 應該拋出錯誤', () => {
      expect(() => Order.create('order-1', '')).toThrow(InvalidOrderOperationError);
    });
  });

  describe('新增項目', () => {
    it('應該能新增訂單項目', () => {
      const item = new OrderItem('p1', '鍵盤', 2500, 1);
      order.addItem(item);

      expect(order.items).toHaveLength(1);
      expect(order.totalAmount).toBe(2500);
    });

    it('應該能新增多個項目並正確計算總額', () => {
      order.addItem(new OrderItem('p1', '鍵盤', 2500, 1));
      order.addItem(new OrderItem('p2', '滑鼠', 800, 2));

      expect(order.items).toHaveLength(2);
      expect(order.totalAmount).toBe(4100); // 2500 + 800*2
    });

    it('應該產生 OrderItemAdded 事件', () => {
      order.addItem(new OrderItem('p1', '鍵盤', 2500, 1));

      const events = order.domainEvents;
      expect(events).toHaveLength(2); // OrderCreated + OrderItemAdded
      expect(events[1].eventType).toBe('OrderItemAdded');
    });
  });

  describe('確認訂單', () => {
    it('有項目的 DRAFT 訂單應該能被確認', () => {
      order.addItem(new OrderItem('p1', '鍵盤', 2500, 1));
      order.confirm();

      expect(order.status).toBe(OrderStatus.CONFIRMED);
    });

    it('空訂單不能被確認', () => {
      expect(() => order.confirm()).toThrow(InvalidOrderOperationError);
      expect(() => order.confirm()).toThrow('至少有一個項目');
    });

    it('已確認的訂單不能再次確認', () => {
      order.addItem(new OrderItem('p1', '鍵盤', 2500, 1));
      order.confirm();

      expect(() => order.confirm()).toThrow(InvalidOrderOperationError);
    });

    it('確認後不能新增項目', () => {
      order.addItem(new OrderItem('p1', '鍵盤', 2500, 1));
      order.confirm();

      expect(() => order.addItem(new OrderItem('p2', '滑鼠', 800, 1))).toThrow(
        InvalidOrderOperationError,
      );
    });
  });

  describe('取消訂單', () => {
    it('DRAFT 訂單可以被取消', () => {
      order.cancel('不想買了');
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });

    it('CONFIRMED 訂單可以被取消', () => {
      order.addItem(new OrderItem('p1', '鍵盤', 2500, 1));
      order.confirm();
      order.cancel('改變心意');

      expect(order.status).toBe(OrderStatus.CANCELLED);
    });

    it('已取消的訂單不能再次取消', () => {
      order.cancel('不想買了');
      expect(() => order.cancel('再取消一次')).toThrow(InvalidOrderOperationError);
    });

    it('取消後應該產生 OrderCancelled 事件', () => {
      order.cancel('不想買了');
      const events = order.domainEvents;
      const cancelEvent = events.find((e) => e.eventType === 'OrderCancelled');
      expect(cancelEvent).toBeDefined();
    });
  });

  describe('事件管理', () => {
    it('clearEvents 應該清除所有事件', () => {
      order.addItem(new OrderItem('p1', '鍵盤', 2500, 1));
      expect(order.domainEvents.length).toBeGreaterThan(0);

      order.clearEvents();
      expect(order.domainEvents).toHaveLength(0);
    });
  });

  describe('reconstruct（重建）', () => {
    it('應該能從持久化資料重建訂單', () => {
      const items = [new OrderItem('p1', '鍵盤', 2500, 1)];
      const createdAt = new Date('2024-01-01');

      const reconstructed = Order.reconstruct(
        'order-1',
        'customer-1',
        items,
        OrderStatus.CONFIRMED,
        createdAt,
      );

      expect(reconstructed.id).toBe('order-1');
      expect(reconstructed.status).toBe(OrderStatus.CONFIRMED);
      expect(reconstructed.items).toHaveLength(1);
      expect(reconstructed.domainEvents).toHaveLength(0); // 重建不觸發事件
    });
  });
});
