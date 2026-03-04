// ============================================================
// Command Handler 測試 - 建立訂單
// ============================================================
// 應用層測試展示了六角形架構的可測試性：
// 我們用簡單的記憶體實作替換外部依賴，
// 完全不需要資料庫或訊息佇列。
//
// 這就是 DIP（依賴反轉原則）帶來的好處。
// ============================================================

import { CreateOrderHandler } from '../../src/application/commands/CreateOrderHandler';
import { InMemoryOrderCommandRepository } from '../../src/adapters/output/persistence/InMemoryOrderCommandRepository';
import { InMemoryOrderQueryRepository } from '../../src/adapters/output/persistence/InMemoryOrderQueryRepository';
import { InMemoryEventPublisher } from '../../src/adapters/output/messaging/InMemoryEventPublisher';
import { FixedIdGenerator } from '../../src/adapters/output/IdGeneratorAdapter';

describe('CreateOrderHandler', () => {
  let handler: CreateOrderHandler;
  let commandRepo: InMemoryOrderCommandRepository;
  let queryRepo: InMemoryOrderQueryRepository;
  let eventPublisher: InMemoryEventPublisher;

  beforeEach(() => {
    commandRepo = new InMemoryOrderCommandRepository();
    queryRepo = new InMemoryOrderQueryRepository();
    eventPublisher = new InMemoryEventPublisher(commandRepo, queryRepo);
    const idGenerator = new FixedIdGenerator('test-order-001');

    handler = new CreateOrderHandler(commandRepo, eventPublisher, idGenerator);
  });

  it('應該成功建立訂單', async () => {
    const result = await handler.execute({
      customerId: 'customer-1',
      items: [
        { productId: 'p1', productName: '鍵盤', unitPrice: 2500, quantity: 1 },
        { productId: 'p2', productName: '滑鼠', unitPrice: 800, quantity: 2 },
      ],
    });

    expect(result.orderId).toBe('test-order-001');
    expect(result.totalAmount).toBe(4100);
    expect(result.status).toBe('DRAFT');
    expect(result.itemCount).toBe(2);
  });

  it('應該將訂單儲存到命令儲存庫', async () => {
    await handler.execute({
      customerId: 'customer-1',
      items: [{ productId: 'p1', productName: '鍵盤', unitPrice: 2500, quantity: 1 }],
    });

    const saved = await commandRepo.findById('test-order-001');
    expect(saved).not.toBeNull();
    expect(saved!.customerId).toBe('customer-1');
  });

  it('應該發布領域事件', async () => {
    await handler.execute({
      customerId: 'customer-1',
      items: [{ productId: 'p1', productName: '鍵盤', unitPrice: 2500, quantity: 1 }],
    });

    const events = eventPublisher.getPublishedEvents();
    expect(events.length).toBeGreaterThan(0);

    const eventTypes = events.map((e) => e.eventType);
    expect(eventTypes).toContain('OrderCreated');
    expect(eventTypes).toContain('OrderItemAdded');
  });

  it('應該同步讀取模型（CQRS 查詢端）', async () => {
    await handler.execute({
      customerId: 'customer-1',
      items: [{ productId: 'p1', productName: '鍵盤', unitPrice: 2500, quantity: 1 }],
    });

    const readModel = await queryRepo.findById('test-order-001');
    expect(readModel).not.toBeNull();
    expect(readModel!.totalAmount).toBe(2500);
    expect(readModel!.items).toHaveLength(1);
  });

  it('無效的訂單項目應該拋出錯誤', async () => {
    await expect(
      handler.execute({
        customerId: 'customer-1',
        items: [{ productId: '', productName: '鍵盤', unitPrice: 2500, quantity: 1 }],
      }),
    ).rejects.toThrow();
  });
});
