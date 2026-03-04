# SOLID 原則 - 物件導向設計的五大原則

## 概述

SOLID 是五個物件導向設計原則的首字母縮寫，由 Robert C. Martin 提出。
這些原則幫助開發者建立可維護、可擴展、可測試的軟體系統。

---

## S - 單一職責原則 (Single Responsibility Principle)

> **一個類別應該只有一個改變的理由。**

### 概念

每個類別只負責一件事。如果一個類別承擔了太多職責，
當其中一個職責需要改變時，可能會影響到其他職責。

### 本專案範例

```
src/
├── domain/models/
│   ├── Order.ts          ← 只負責訂單業務邏輯
│   ├── OrderItem.ts      ← 只負責訂單項目的計算
│   └── Product.ts        ← 只負責產品的驗證
├── application/commands/
│   ├── CreateOrderHandler.ts   ← 只負責「建立訂單」
│   ├── ConfirmOrderHandler.ts  ← 只負責「確認訂單」
│   └── CancelOrderHandler.ts   ← 只負責「取消訂單」
└── application/queries/
    └── GetOrderHandler.ts       ← 只負責「查詢訂單」
```

**對比錯誤做法：**

```typescript
// ❌ 違反 SRP - 一個類別做太多事
class OrderService {
  createOrder() { /* ... */ }
  confirmOrder() { /* ... */ }
  cancelOrder() { /* ... */ }
  getOrder() { /* ... */ }
  listOrders() { /* ... */ }
  sendEmail() { /* ... */ }
  generateReport() { /* ... */ }
}

// ✅ 遵循 SRP - 每個 Handler 只做一件事
class CreateOrderHandler {
  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    // 只負責建立訂單的流程
  }
}
```

---

## O - 開放封閉原則 (Open/Closed Principle)

> **軟體實體應該對擴展開放，對修改封閉。**

### 概念

你應該能夠在不修改現有程式碼的情況下擴展系統行為。

### 本專案範例

**領域事件系統**展示了 OCP：

```typescript
// 基礎事件介面（封閉，不需修改）
interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredOn: Date;
  readonly aggregateId: string;
}

// 擴展新事件（開放，只需新增類別）
class OrderCreatedEvent implements DomainEvent { /* ... */ }
class OrderConfirmedEvent implements DomainEvent { /* ... */ }
class OrderCancelledEvent implements DomainEvent { /* ... */ }
// 未來新增：OrderShippedEvent, OrderRefundedEvent...
```

**EventPublisher 也遵循 OCP：**

```typescript
// 不管有多少種事件，EventPublisher 的介面不需改變
interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}
```

---

## L - 里氏替換原則 (Liskov Substitution Principle)

> **子型別必須能夠替代其基本型別使用。**

### 概念

如果程式使用的是父類別（或介面），那麼換成任何子類別（或實作）
都不應該破壞程式的正確性。

### 本專案範例

**Repository 的替換性：**

```typescript
// 介面定義
interface OrderCommandRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}

// 實作 A：記憶體版（開發/測試用）
class InMemoryOrderCommandRepository implements OrderCommandRepository { /* ... */ }

// 實作 B：PostgreSQL 版（生產環境）— 可以無縫替換
// class PostgresOrderRepository implements OrderCommandRepository { /* ... */ }

// 實作 C：MongoDB 版 — 同樣可以無縫替換
// class MongoOrderRepository implements OrderCommandRepository { /* ... */ }
```

**Application 層不需要知道用的是哪個實作：**

```typescript
class CreateOrderHandler {
  constructor(
    private readonly orderRepository: OrderCommandRepository, // ← 依賴抽象
    // ...
  ) {}
}
```

---

## I - 介面隔離原則 (Interface Segregation Principle)

> **客戶端不應該被迫依賴它不使用的介面。**

### 概念

用多個小而專注的介面取代一個大而全的介面。

### 本專案範例

**CQRS 中的讀寫分離就是 ISP 的完美體現：**

```typescript
// ❌ 違反 ISP - 一個大介面
interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
  findAll(): Promise<OrderReadModel[]>;
  findByCustomerId(customerId: string): Promise<OrderReadModel[]>;
}

// ✅ 遵循 ISP - 分離的小介面
interface OrderCommandRepository {  // 寫入端只需要這些
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
}

interface OrderQueryRepository {    // 讀取端只需要這些
  findById(id: string): Promise<OrderReadModel | null>;
  findAll(): Promise<OrderReadModel[]>;
  findByCustomerId(customerId: string): Promise<OrderReadModel[]>;
}
```

**Use Case 介面同樣遵循 ISP：**

```typescript
// 每個用例是獨立介面，Controller 只依賴它需要的
interface CreateOrderUseCase {
  execute(input: CreateOrderInput): Promise<CreateOrderOutput>;
}

interface GetOrderUseCase {
  execute(orderId: string): Promise<OrderView>;
}

interface ConfirmOrderUseCase {
  execute(orderId: string): Promise<ConfirmOrderOutput>;
}
```

---

## D - 依賴反轉原則 (Dependency Inversion Principle)

> **高階模組不應該依賴低階模組，兩者都應該依賴抽象。**

### 概念

業務邏輯（高階）不應該直接依賴資料庫、API 等（低階），
而是透過介面（抽象）來溝通。

### 本專案範例

**這是整個六角形架構的基石：**

```
依賴方向（箭頭 = 依賴）：

┌─────────────────────────────────────────────┐
│  Adapters（外層）                             │
│                                              │
│  OrderController ──→ CreateOrderUseCase      │
│                       (Input Port 介面)       │
│                                              │
│  InMemoryRepo ──→ OrderCommandRepository     │
│                    (Output Port 介面)         │
│                                              │
│       ↓ 所有依賴都指向內層（抽象）              │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  Application（內層）                   │    │
│  │                                      │    │
│  │  CreateOrderHandler                  │    │
│  │    ← implements CreateOrderUseCase   │    │
│  │    → uses OrderCommandRepository     │    │
│  │    → uses EventPublisher             │    │
│  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

**DependencyInjection.ts 是唯一知道所有具體類別的地方：**

```typescript
// 在 DI 容器中組裝依賴
const commandRepo = new InMemoryOrderCommandRepository(); // 具體類別
const handler = new CreateOrderHandler(
  commandRepo,        // ← 注入時用具體類別
  eventPublisher,     //    但 Handler 只看到介面
  idGenerator,
);
```

---

## SOLID 原則之間的關係

```
SRP（單一職責）
 └→ 每個類別職責單一，自然容易遵循其他原則

OCP（開放封閉）
 └→ 透過抽象擴展，而非修改

LSP（里氏替換）
 └→ 確保替換實作不會破壞系統

ISP（介面隔離）
 └→ 小而專注的介面，讓 SRP 和 DIP 更容易實現

DIP（依賴反轉）
 └→ 依賴抽象讓 OCP 和 LSP 成為可能
```

這五個原則相互支持，共同構成了穩固的軟體設計基礎。
