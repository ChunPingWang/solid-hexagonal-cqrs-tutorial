// ============================================================
// Dependency Injection Container - 依賴注入容器
// ============================================================
// 這是整個架構的「組裝」層，負責將所有元件連接在一起。
//
// 依賴注入是實現 DIP（依賴反轉原則）的關鍵技術：
// - 應用層的 Handler 依賴抽象介面（Ports）
// - 具體實作（Adapters）在此處被注入
// - 所有依賴的方向都指向內層（核心）
//
// 在六角形架構中，這一層位於最外圈，
// 是唯一知道所有具體類別的地方。
// ============================================================

import { InMemoryOrderCommandRepository } from '../adapters/output/persistence/InMemoryOrderCommandRepository';
import { InMemoryOrderQueryRepository } from '../adapters/output/persistence/InMemoryOrderQueryRepository';
import { InMemoryEventPublisher } from '../adapters/output/messaging/InMemoryEventPublisher';
import { UuidGenerator } from '../adapters/output/IdGeneratorAdapter';
import { CreateOrderHandler } from '../application/commands/CreateOrderHandler';
import { ConfirmOrderHandler } from '../application/commands/ConfirmOrderHandler';
import { CancelOrderHandler } from '../application/commands/CancelOrderHandler';
import { GetOrderHandler, ListOrdersHandler } from '../application/queries/GetOrderHandler';
import { OrderController } from '../adapters/input/api/OrderController';

export interface AppContainer {
  orderController: OrderController;
  commandRepo: InMemoryOrderCommandRepository;
  queryRepo: InMemoryOrderQueryRepository;
  eventPublisher: InMemoryEventPublisher;
}

/**
 * 建立並組裝所有依賴
 *
 * 組裝順序體現了六角形架構的依賴方向：
 * 1. 先建立外層的 Driven Adapters（被驅動適配器）
 * 2. 將它們注入到 Application 層的 Handlers
 * 3. 將 Handlers 注入到 Driving Adapter（驅動適配器）
 */
export function createContainer(): AppContainer {
  // === 第一步：建立 Driven Adapters（Output / 被驅動端）===
  const commandRepo = new InMemoryOrderCommandRepository();
  const queryRepo = new InMemoryOrderQueryRepository();
  const eventPublisher = new InMemoryEventPublisher(commandRepo, queryRepo);
  const idGenerator = new UuidGenerator();

  // === 第二步：建立 Application Handlers ===
  // Command Handlers（寫入端）
  const createOrderHandler = new CreateOrderHandler(commandRepo, eventPublisher, idGenerator);
  const confirmOrderHandler = new ConfirmOrderHandler(commandRepo, eventPublisher);
  const cancelOrderHandler = new CancelOrderHandler(commandRepo, eventPublisher);

  // Query Handlers（讀取端）
  const getOrderHandler = new GetOrderHandler(queryRepo);
  const listOrdersHandler = new ListOrdersHandler(queryRepo);

  // === 第三步：建立 Driving Adapter（Input / 驅動端）===
  const orderController = new OrderController(
    createOrderHandler,
    getOrderHandler,
    listOrdersHandler,
    confirmOrderHandler,
    cancelOrderHandler,
  );

  return { orderController, commandRepo, queryRepo, eventPublisher };
}
