// ============================================================
// Query Handler 測試 - 查詢訂單
// ============================================================
// 測試 CQRS 的查詢端，驗證讀取模型的正確性。
// ============================================================

import { CreateOrderHandler } from '../../src/application/commands/CreateOrderHandler';
import { GetOrderHandler, ListOrdersHandler } from '../../src/application/queries/GetOrderHandler';
import { InMemoryOrderCommandRepository } from '../../src/adapters/output/persistence/InMemoryOrderCommandRepository';
import { InMemoryOrderQueryRepository } from '../../src/adapters/output/persistence/InMemoryOrderQueryRepository';
import { InMemoryEventPublisher } from '../../src/adapters/output/messaging/InMemoryEventPublisher';
import { FixedIdGenerator } from '../../src/adapters/output/IdGeneratorAdapter';
import { OrderNotFoundError } from '../../src/domain/errors/DomainError';

describe('GetOrderHandler（CQRS 查詢端）', () => {
  let createHandler: CreateOrderHandler;
  let getOrderHandler: GetOrderHandler;
  let listOrdersHandler: ListOrdersHandler;
  let commandRepo: InMemoryOrderCommandRepository;
  let queryRepo: InMemoryOrderQueryRepository;
  let eventPublisher: InMemoryEventPublisher;

  beforeEach(() => {
    commandRepo = new InMemoryOrderCommandRepository();
    queryRepo = new InMemoryOrderQueryRepository();
    eventPublisher = new InMemoryEventPublisher(commandRepo, queryRepo);

    getOrderHandler = new GetOrderHandler(queryRepo);
    listOrdersHandler = new ListOrdersHandler(queryRepo);
  });

  it('應該能查詢已建立的訂單', async () => {
    const idGen = new FixedIdGenerator('order-q1');
    createHandler = new CreateOrderHandler(commandRepo, eventPublisher, idGen);

    await createHandler.execute({
      customerId: 'c1',
      items: [{ productId: 'p1', productName: '鍵盤', unitPrice: 2500, quantity: 1 }],
    });

    const result = await getOrderHandler.execute('order-q1');

    expect(result.id).toBe('order-q1');
    expect(result.customerId).toBe('c1');
    expect(result.totalAmount).toBe(2500);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].productName).toBe('鍵盤');
  });

  it('查詢不存在的訂單應該拋出錯誤', async () => {
    await expect(getOrderHandler.execute('non-existent')).rejects.toThrow(OrderNotFoundError);
  });

  it('應該能列出所有訂單', async () => {
    const idGen = new FixedIdGenerator('order-1', 'order-2');
    createHandler = new CreateOrderHandler(commandRepo, eventPublisher, idGen);

    await createHandler.execute({
      customerId: 'c1',
      items: [{ productId: 'p1', productName: '鍵盤', unitPrice: 2500, quantity: 1 }],
    });
    await createHandler.execute({
      customerId: 'c2',
      items: [{ productId: 'p2', productName: '滑鼠', unitPrice: 800, quantity: 1 }],
    });

    const result = await listOrdersHandler.execute();
    expect(result).toHaveLength(2);
  });

  it('應該能依客戶 ID 篩選訂單', async () => {
    const idGen = new FixedIdGenerator('order-1', 'order-2', 'order-3');
    createHandler = new CreateOrderHandler(commandRepo, eventPublisher, idGen);

    await createHandler.execute({
      customerId: 'c1',
      items: [{ productId: 'p1', productName: '鍵盤', unitPrice: 2500, quantity: 1 }],
    });
    await createHandler.execute({
      customerId: 'c2',
      items: [{ productId: 'p2', productName: '滑鼠', unitPrice: 800, quantity: 1 }],
    });
    await createHandler.execute({
      customerId: 'c1',
      items: [{ productId: 'p3', productName: '螢幕', unitPrice: 12000, quantity: 1 }],
    });

    const result = await listOrdersHandler.execute('c1');
    expect(result).toHaveLength(2);
    expect(result.every((o) => o.customerId === 'c1')).toBe(true);
  });
});
