// ============================================================
// Command Handler 測試 - 確認與取消訂單
// ============================================================

import { CreateOrderHandler } from '../../src/application/commands/CreateOrderHandler';
import { ConfirmOrderHandler } from '../../src/application/commands/ConfirmOrderHandler';
import { CancelOrderHandler } from '../../src/application/commands/CancelOrderHandler';
import { InMemoryOrderCommandRepository } from '../../src/adapters/output/persistence/InMemoryOrderCommandRepository';
import { InMemoryOrderQueryRepository } from '../../src/adapters/output/persistence/InMemoryOrderQueryRepository';
import { InMemoryEventPublisher } from '../../src/adapters/output/messaging/InMemoryEventPublisher';
import { FixedIdGenerator } from '../../src/adapters/output/IdGeneratorAdapter';
import { OrderNotFoundError } from '../../src/domain/errors/DomainError';

describe('ConfirmOrderHandler', () => {
  let createHandler: CreateOrderHandler;
  let confirmHandler: ConfirmOrderHandler;
  let commandRepo: InMemoryOrderCommandRepository;
  let queryRepo: InMemoryOrderQueryRepository;
  let eventPublisher: InMemoryEventPublisher;

  beforeEach(() => {
    commandRepo = new InMemoryOrderCommandRepository();
    queryRepo = new InMemoryOrderQueryRepository();
    eventPublisher = new InMemoryEventPublisher(commandRepo, queryRepo);
    const idGenerator = new FixedIdGenerator('order-001');

    createHandler = new CreateOrderHandler(commandRepo, eventPublisher, idGenerator);
    confirmHandler = new ConfirmOrderHandler(commandRepo, eventPublisher);
  });

  it('應該成功確認訂單', async () => {
    await createHandler.execute({
      customerId: 'c1',
      items: [{ productId: 'p1', productName: '鍵盤', unitPrice: 2500, quantity: 1 }],
    });

    const result = await confirmHandler.execute('order-001');

    expect(result.orderId).toBe('order-001');
    expect(result.status).toBe('CONFIRMED');
    expect(result.totalAmount).toBe(2500);
  });

  it('不存在的訂單應該拋出 OrderNotFoundError', async () => {
    await expect(confirmHandler.execute('non-existent')).rejects.toThrow(OrderNotFoundError);
  });

  it('確認後讀取模型應該同步更新', async () => {
    await createHandler.execute({
      customerId: 'c1',
      items: [{ productId: 'p1', productName: '鍵盤', unitPrice: 2500, quantity: 1 }],
    });
    await confirmHandler.execute('order-001');

    const readModel = await queryRepo.findById('order-001');
    expect(readModel!.status).toBe('CONFIRMED');
  });
});

describe('CancelOrderHandler', () => {
  let createHandler: CreateOrderHandler;
  let cancelHandler: CancelOrderHandler;
  let commandRepo: InMemoryOrderCommandRepository;
  let queryRepo: InMemoryOrderQueryRepository;
  let eventPublisher: InMemoryEventPublisher;

  beforeEach(() => {
    commandRepo = new InMemoryOrderCommandRepository();
    queryRepo = new InMemoryOrderQueryRepository();
    eventPublisher = new InMemoryEventPublisher(commandRepo, queryRepo);
    const idGenerator = new FixedIdGenerator('order-001');

    createHandler = new CreateOrderHandler(commandRepo, eventPublisher, idGenerator);
    cancelHandler = new CancelOrderHandler(commandRepo, eventPublisher);
  });

  it('應該成功取消訂單', async () => {
    await createHandler.execute({
      customerId: 'c1',
      items: [{ productId: 'p1', productName: '鍵盤', unitPrice: 2500, quantity: 1 }],
    });

    const result = await cancelHandler.execute('order-001', '客戶要求取消');

    expect(result.orderId).toBe('order-001');
    expect(result.status).toBe('CANCELLED');
    expect(result.reason).toBe('客戶要求取消');
  });

  it('不存在的訂單應該拋出 OrderNotFoundError', async () => {
    await expect(cancelHandler.execute('non-existent', '理由')).rejects.toThrow(
      OrderNotFoundError,
    );
  });
});
