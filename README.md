# 六角形架構 + CQRS + SOLID 原則 教學專案

> 透過一個**訂單管理系統**，學習如何結合六角形架構 (Hexagonal Architecture)、CQRS 模式 (Command Query Responsibility Segregation) 與 SOLID 原則，設計出乾淨、可測試、可擴展的軟體架構。

---

## 目錄

- [快速開始](#快速開始)
- [專案結構](#專案結構)
- [架構總覽圖](#架構總覽圖)
- [類別圖](#類別圖)
- [循序圖](#循序圖)
- [三大架構概念詳解](#三大架構概念詳解)
  - [1. SOLID 原則](#1-solid-原則)
  - [2. 六角形架構](#2-六角形架構-hexagonal-architecture)
  - [3. CQRS 模式](#3-cqrs-模式)
- [架構比較與優劣分析](#架構比較與優劣分析)
- [測試](#測試)
- [教學文件](#教學文件)
- [延伸思考](#延伸思考)

---

## 快速開始

```bash
npm install           # 安裝依賴
npm test              # 執行測試（46 個測試案例）
npm start             # 執行範例程式
npm run build         # 編譯 TypeScript
npm run test:coverage # 執行測試覆蓋率報告
```

---

## 專案結構

```
solid-hexagonal-cqrs-tutorial/
│
├── src/
│   ├── domain/                          # 領域層（最內層 - 零外部依賴）
│   │   ├── models/
│   │   │   ├── Order.ts                 #   訂單聚合根（Aggregate Root）
│   │   │   ├── OrderItem.ts             #   訂單項目值物件（Value Object）
│   │   │   └── Product.ts               #   產品值物件（Value Object）
│   │   ├── events/
│   │   │   └── DomainEvent.ts           #   領域事件定義
│   │   └── errors/
│   │       └── DomainError.ts           #   領域錯誤定義
│   │
│   ├── application/                     # 應用層（中間層 - 協調業務流程）
│   │   ├── ports/
│   │   │   ├── input/                   #   Input Ports（驅動端介面）
│   │   │   │   ├── CreateOrderUseCase.ts
│   │   │   │   ├── GetOrderUseCase.ts
│   │   │   │   ├── ConfirmOrderUseCase.ts
│   │   │   │   └── CancelOrderUseCase.ts
│   │   │   └── output/                  #   Output Ports（被驅動端介面）
│   │   │       ├── OrderRepository.ts   #   讀寫分離的儲存庫介面（ISP）
│   │   │       ├── EventPublisher.ts
│   │   │       └── IdGenerator.ts
│   │   ├── commands/                    #   CQRS 命令端 Handlers
│   │   │   ├── CreateOrderHandler.ts
│   │   │   ├── ConfirmOrderHandler.ts
│   │   │   └── CancelOrderHandler.ts
│   │   └── queries/                     #   CQRS 查詢端 Handlers
│   │       └── GetOrderHandler.ts
│   │
│   ├── adapters/                        # 適配器層（最外層 - 與外部世界對接）
│   │   ├── input/                       #   Driving Adapters（驅動適配器）
│   │   │   └── api/
│   │   │       └── OrderController.ts
│   │   └── output/                      #   Driven Adapters（被驅動適配器）
│   │       ├── persistence/
│   │       │   ├── InMemoryOrderCommandRepository.ts
│   │       │   └── InMemoryOrderQueryRepository.ts
│   │       ├── messaging/
│   │       │   └── InMemoryEventPublisher.ts
│   │       └── IdGeneratorAdapter.ts
│   │
│   ├── infrastructure/                  # 基礎設施（組裝層）
│   │   └── DependencyInjection.ts       #   DI 容器
│   │
│   └── index.ts                         # 入口程式
│
├── tests/                               # 測試
│   ├── domain/Order.test.ts             #   領域模型單元測試（25 tests）
│   ├── application/
│   │   ├── CreateOrderHandler.test.ts   #   建立訂單命令測試（5 tests）
│   │   ├── ConfirmAndCancelHandler.test.ts  # 確認/取消命令測試（5 tests）
│   │   └── GetOrderHandler.test.ts      #   CQRS 查詢端測試（4 tests）
│   └── adapters/
│       └── OrderController.test.ts      #   端到端整合測試（7 tests）
│
└── docs/                                # 教學文件
    ├── 01-solid-principles.md
    ├── 02-hexagonal-architecture.md
    └── 03-cqrs-pattern.md
```

---

## 架構總覽圖

### 六角形架構 + CQRS 全景

```mermaid
graph TB
    subgraph External["外部世界"]
        User["使用者 / API 客戶端"]
        DB["資料庫 / 持久化儲存"]
        MQ["訊息佇列"]
    end

    subgraph Adapters["適配器層 Adapters"]
        subgraph DrivingAdapters["驅動適配器 (Input)"]
            Controller["OrderController<br/>REST API 入口"]
        end

        subgraph DrivenAdapters["被驅動適配器 (Output)"]
            CmdRepo["InMemoryOrderCommandRepository<br/>寫入儲存庫"]
            QryRepo["InMemoryOrderQueryRepository<br/>讀取儲存庫"]
            EvtPub["InMemoryEventPublisher<br/>事件發布者"]
            IdGen["UuidGenerator<br/>ID 產生器"]
        end
    end

    subgraph Application["應用層 Application"]
        subgraph InputPorts["Input Ports（驅動端介面）"]
            CreateUC["CreateOrderUseCase"]
            ConfirmUC["ConfirmOrderUseCase"]
            CancelUC["CancelOrderUseCase"]
            GetUC["GetOrderUseCase"]
            ListUC["ListOrdersUseCase"]
        end

        subgraph CommandSide["CQRS 命令端（寫入）"]
            CreateH["CreateOrderHandler"]
            ConfirmH["ConfirmOrderHandler"]
            CancelH["CancelOrderHandler"]
        end

        subgraph QuerySide["CQRS 查詢端（讀取）"]
            GetH["GetOrderHandler"]
            ListH["ListOrdersHandler"]
        end

        subgraph OutputPorts["Output Ports（被驅動端介面）"]
            CmdRepoPort["OrderCommandRepository"]
            QryRepoPort["OrderQueryRepository"]
            EvtPubPort["EventPublisher"]
            IdGenPort["IdGenerator"]
        end
    end

    subgraph Domain["領域層 Domain（核心）"]
        Order["Order<br/>聚合根"]
        OrderItem["OrderItem<br/>值物件"]
        Product["Product<br/>值物件"]
        Events["DomainEvent<br/>領域事件"]
        Errors["DomainError<br/>領域錯誤"]
    end

    User --> Controller
    Controller --> CreateUC & ConfirmUC & CancelUC & GetUC & ListUC

    CreateUC -.->|implements| CreateH
    ConfirmUC -.->|implements| ConfirmH
    CancelUC -.->|implements| CancelH
    GetUC -.->|implements| GetH
    ListUC -.->|implements| ListH

    CreateH --> Order & OrderItem
    ConfirmH --> Order
    CancelH --> Order
    CreateH --> CmdRepoPort & EvtPubPort & IdGenPort
    ConfirmH --> CmdRepoPort & EvtPubPort
    CancelH --> CmdRepoPort & EvtPubPort
    GetH --> QryRepoPort
    ListH --> QryRepoPort

    Order --> Events & Errors
    OrderItem --> Errors

    CmdRepoPort -.->|implements| CmdRepo
    QryRepoPort -.->|implements| QryRepo
    EvtPubPort -.->|implements| EvtPub
    IdGenPort -.->|implements| IdGen

    CmdRepo --> DB
    QryRepo --> DB
    EvtPub --> MQ
    EvtPub -->|同步 Read Model| QryRepo

    style Domain fill:#4a90d9,color:#fff
    style Application fill:#7ab648,color:#fff
    style Adapters fill:#e8943a,color:#fff
    style External fill:#888,color:#fff
```

### 依賴方向（由外向內）

```mermaid
graph LR
    A["Adapters<br/>適配器層<br/>(最外層)"] -->|依賴| B["Application<br/>應用層<br/>(中間層)"]
    B -->|依賴| C["Domain<br/>領域層<br/>(最內層)"]

    style A fill:#e8943a,color:#fff
    style B fill:#7ab648,color:#fff
    style C fill:#4a90d9,color:#fff
```

> **關鍵規則**：依賴只能由外層指向內層，內層絕不依賴外層。Domain 層零外部依賴。

---

## 類別圖

### Domain Layer 類別圖

```mermaid
classDiagram
    class Order {
        +string id
        +string customerId
        -OrderItem[] _items
        -OrderStatus _status
        -Date _createdAt
        -DomainEvent[] _domainEvents
        +items: ReadonlyArray~OrderItem~
        +status: OrderStatus
        +createdAt: Date
        +totalAmount: number
        +domainEvents: ReadonlyArray~DomainEvent~
        +addItem(item: OrderItem) void
        +confirm() void
        +cancel(reason: string) void
        +clearEvents() void
        +create(id, customerId)$ Order
        +reconstruct(...)$ Order
    }

    class OrderItem {
        +string productId
        +string productName
        +number unitPrice
        +number quantity
        +number subtotal
    }

    class Product {
        +string id
        +string name
        +number price
    }

    class OrderStatus {
        <<enumeration>>
        DRAFT
        CONFIRMED
        CANCELLED
    }

    class DomainEvent {
        <<interface>>
        +string eventId
        +string eventType
        +Date occurredOn
        +string aggregateId
    }

    class OrderCreatedEvent {
        +string customerId
        +number totalAmount
    }

    class OrderItemAddedEvent {
        +string productId
        +number quantity
    }

    class OrderConfirmedEvent {
    }

    class OrderCancelledEvent {
        +string reason
    }

    class DomainError {
        +string message
        +string name
    }

    class OrderNotFoundError
    class InvalidOrderOperationError
    class InvalidOrderItemError

    Order "1" *-- "*" OrderItem : contains
    Order --> OrderStatus : has status
    Order --> DomainEvent : produces

    DomainEvent <|.. OrderCreatedEvent
    DomainEvent <|.. OrderItemAddedEvent
    DomainEvent <|.. OrderConfirmedEvent
    DomainEvent <|.. OrderCancelledEvent

    DomainError <|-- OrderNotFoundError
    DomainError <|-- InvalidOrderOperationError
    DomainError <|-- InvalidOrderItemError

    Order ..> InvalidOrderOperationError : throws
    OrderItem ..> InvalidOrderItemError : throws
```

### Application Layer 類別圖（Ports & Handlers）

```mermaid
classDiagram
    %% Input Ports
    class CreateOrderUseCase {
        <<interface>>
        +execute(input: CreateOrderInput) Promise~CreateOrderOutput~
    }

    class GetOrderUseCase {
        <<interface>>
        +execute(orderId: string) Promise~OrderView~
    }

    class ListOrdersUseCase {
        <<interface>>
        +execute(customerId?: string) Promise~OrderView[]~
    }

    class ConfirmOrderUseCase {
        <<interface>>
        +execute(orderId: string) Promise~ConfirmOrderOutput~
    }

    class CancelOrderUseCase {
        <<interface>>
        +execute(orderId: string, reason: string) Promise~CancelOrderOutput~
    }

    %% Output Ports
    class OrderCommandRepository {
        <<interface>>
        +save(order: Order) Promise~void~
        +findById(id: string) Promise~Order | null~
    }

    class OrderQueryRepository {
        <<interface>>
        +findById(id: string) Promise~OrderReadModel | null~
        +findAll() Promise~OrderReadModel[]~
        +findByCustomerId(customerId: string) Promise~OrderReadModel[]~
    }

    class EventPublisher {
        <<interface>>
        +publish(event: DomainEvent) Promise~void~
        +publishAll(events: DomainEvent[]) Promise~void~
    }

    class IdGenerator {
        <<interface>>
        +generate() string
    }

    %% Command Handlers
    class CreateOrderHandler {
        -OrderCommandRepository orderRepository
        -EventPublisher eventPublisher
        -IdGenerator idGenerator
        +execute(input) Promise~CreateOrderOutput~
    }

    class ConfirmOrderHandler {
        -OrderCommandRepository orderRepository
        -EventPublisher eventPublisher
        +execute(orderId) Promise~ConfirmOrderOutput~
    }

    class CancelOrderHandler {
        -OrderCommandRepository orderRepository
        -EventPublisher eventPublisher
        +execute(orderId, reason) Promise~CancelOrderOutput~
    }

    %% Query Handlers
    class GetOrderHandler {
        -OrderQueryRepository queryRepository
        +execute(orderId) Promise~OrderView~
    }

    class ListOrdersHandler {
        -OrderQueryRepository queryRepository
        +execute(customerId?) Promise~OrderView[]~
    }

    %% Relationships
    CreateOrderUseCase <|.. CreateOrderHandler : implements
    ConfirmOrderUseCase <|.. ConfirmOrderHandler : implements
    CancelOrderUseCase <|.. CancelOrderHandler : implements
    GetOrderUseCase <|.. GetOrderHandler : implements
    ListOrdersUseCase <|.. ListOrdersHandler : implements

    CreateOrderHandler --> OrderCommandRepository : uses
    CreateOrderHandler --> EventPublisher : uses
    CreateOrderHandler --> IdGenerator : uses
    ConfirmOrderHandler --> OrderCommandRepository : uses
    ConfirmOrderHandler --> EventPublisher : uses
    CancelOrderHandler --> OrderCommandRepository : uses
    CancelOrderHandler --> EventPublisher : uses
    GetOrderHandler --> OrderQueryRepository : uses
    ListOrdersHandler --> OrderQueryRepository : uses
```

### Adapter Layer 類別圖

```mermaid
classDiagram
    class OrderController {
        -CreateOrderUseCase createOrderUseCase
        -GetOrderUseCase getOrderUseCase
        -ListOrdersUseCase listOrdersUseCase
        -ConfirmOrderUseCase confirmOrderUseCase
        -CancelOrderUseCase cancelOrderUseCase
        +createOrder(body) Promise~ApiResponse~
        +getOrder(orderId) Promise~ApiResponse~
        +listOrders(customerId?) Promise~ApiResponse~
        +confirmOrder(orderId) Promise~ApiResponse~
        +cancelOrder(orderId, reason) Promise~ApiResponse~
    }

    class InMemoryOrderCommandRepository {
        -Map store
        +save(order: Order) Promise~void~
        +findById(id: string) Promise~Order | null~
        +clear() void
        +size() number
    }

    class InMemoryOrderQueryRepository {
        -Map store
        +sync(readModel: OrderReadModel) void
        +findById(id) Promise~OrderReadModel | null~
        +findAll() Promise~OrderReadModel[]~
        +findByCustomerId(customerId) Promise~OrderReadModel[]~
        +clear() void
    }

    class InMemoryEventPublisher {
        -DomainEvent[] publishedEvents
        -InMemoryOrderCommandRepository commandRepo
        -InMemoryOrderQueryRepository queryRepo
        +publish(event) Promise~void~
        +publishAll(events) Promise~void~
        -syncReadModel(orderId) Promise~void~
    }

    class UuidGenerator {
        +generate() string
    }

    class FixedIdGenerator {
        -string[] ids
        -number index
        +generate() string
    }

    class OrderCommandRepository {
        <<interface>>
    }

    class OrderQueryRepository {
        <<interface>>
    }

    class EventPublisher {
        <<interface>>
    }

    class IdGenerator {
        <<interface>>
    }

    OrderCommandRepository <|.. InMemoryOrderCommandRepository : implements
    OrderQueryRepository <|.. InMemoryOrderQueryRepository : implements
    EventPublisher <|.. InMemoryEventPublisher : implements
    IdGenerator <|.. UuidGenerator : implements
    IdGenerator <|.. FixedIdGenerator : implements

    InMemoryEventPublisher --> InMemoryOrderCommandRepository : reads from
    InMemoryEventPublisher --> InMemoryOrderQueryRepository : syncs to

    OrderController --> CreateOrderUseCase : uses
    OrderController --> GetOrderUseCase : uses
    OrderController --> ConfirmOrderUseCase : uses
    OrderController --> CancelOrderUseCase : uses

    class CreateOrderUseCase {
        <<interface>>
    }

    class GetOrderUseCase {
        <<interface>>
    }

    class ConfirmOrderUseCase {
        <<interface>>
    }

    class CancelOrderUseCase {
        <<interface>>
    }
```

---

## 循序圖

### 1. 建立訂單（Command Flow - 寫入端）

```mermaid
sequenceDiagram
    actor User as 使用者
    participant Ctrl as OrderController<br/>(Driving Adapter)
    participant Handler as CreateOrderHandler<br/>(Command Handler)
    participant IdGen as IdGenerator<br/>(Output Port)
    participant Order as Order<br/>(Aggregate Root)
    participant CmdRepo as OrderCommandRepository<br/>(Output Port)
    participant EvtPub as EventPublisher<br/>(Output Port)
    participant QryRepo as OrderQueryRepository<br/>(Read Model)

    User->>Ctrl: createOrder({customerId, items})
    activate Ctrl
    Ctrl->>Handler: execute(input)
    activate Handler

    Handler->>IdGen: generate()
    IdGen-->>Handler: "order-uuid-123"

    Handler->>Order: Order.create("order-uuid-123", "customer-1")
    activate Order
    Note over Order: 產生 OrderCreatedEvent
    Order-->>Handler: order instance
    deactivate Order

    loop 每個訂單項目
        Handler->>Order: addItem(new OrderItem(...))
        Note over Order: 驗證狀態必須是 DRAFT<br/>計算 subtotal<br/>產生 OrderItemAddedEvent
    end

    Handler->>CmdRepo: save(order)
    Note over CmdRepo: 序列化並儲存至 Write Store

    Handler->>EvtPub: publishAll(domainEvents)
    activate EvtPub
    Note over EvtPub: 收到事件後同步 Read Model

    EvtPub->>CmdRepo: findById(orderId)
    CmdRepo-->>EvtPub: order

    EvtPub->>QryRepo: sync(orderReadModel)
    Note over QryRepo: 儲存扁平化的讀取模型<br/>（預先計算 totalAmount 等欄位）
    deactivate EvtPub

    Handler->>Order: clearEvents()

    Handler-->>Ctrl: {orderId, totalAmount, status, itemCount}
    deactivate Handler

    Ctrl-->>User: ApiResponse {success: true, data: {...}}
    deactivate Ctrl
```

### 2. 查詢訂單（Query Flow - 讀取端）

```mermaid
sequenceDiagram
    actor User as 使用者
    participant Ctrl as OrderController<br/>(Driving Adapter)
    participant Handler as GetOrderHandler<br/>(Query Handler)
    participant QryRepo as OrderQueryRepository<br/>(Read Model Store)

    User->>Ctrl: getOrder("order-uuid-123")
    activate Ctrl
    Ctrl->>Handler: execute("order-uuid-123")
    activate Handler

    Handler->>QryRepo: findById("order-uuid-123")
    activate QryRepo
    Note over QryRepo: 直接讀取預先計算好的<br/>扁平化 Read Model
    QryRepo-->>Handler: OrderReadModel
    deactivate QryRepo

    Note over Handler: 不需要經過 Domain Model<br/>不需要業務邏輯計算<br/>直接將 ReadModel 轉為 View

    Handler-->>Ctrl: OrderView {id, items, totalAmount, status, ...}
    deactivate Handler

    Ctrl-->>User: ApiResponse {success: true, data: {...}}
    deactivate Ctrl
```

### 3. 確認訂單（Command Flow - 狀態轉換）

```mermaid
sequenceDiagram
    actor User as 使用者
    participant Ctrl as OrderController
    participant Handler as ConfirmOrderHandler
    participant CmdRepo as OrderCommandRepository
    participant Order as Order (Aggregate Root)
    participant EvtPub as EventPublisher
    participant QryRepo as OrderQueryRepository

    User->>Ctrl: confirmOrder("order-123")
    Ctrl->>Handler: execute("order-123")

    Handler->>CmdRepo: findById("order-123")
    CmdRepo-->>Handler: order (DRAFT)

    Handler->>Order: confirm()
    activate Order
    Note over Order: 驗證：狀態 == DRAFT?<br/>驗證：items.length > 0?<br/>狀態轉換 DRAFT → CONFIRMED<br/>產生 OrderConfirmedEvent
    Order-->>Handler: void
    deactivate Order

    Handler->>CmdRepo: save(order)
    Handler->>EvtPub: publishAll(events)
    EvtPub->>QryRepo: sync(updatedReadModel)
    Note over QryRepo: Read Model 的 status<br/>更新為 "CONFIRMED"

    Handler-->>Ctrl: {orderId, status: "CONFIRMED", totalAmount}
    Ctrl-->>User: ApiResponse {success: true}
```

### 4. 訂單狀態機

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Order.create()
    DRAFT --> DRAFT : addItem()
    DRAFT --> CONFIRMED : confirm()
    DRAFT --> CANCELLED : cancel(reason)
    CONFIRMED --> CANCELLED : cancel(reason)

    CONFIRMED --> CONFIRMED : [不可新增項目]
    CANCELLED --> CANCELLED : [不可再操作]

    note right of DRAFT : 初始狀態<br/>可新增項目
    note right of CONFIRMED : 已確認<br/>可取消
    note right of CANCELLED : 最終狀態<br/>不可變更
```

### 5. 依賴注入組裝流程

```mermaid
sequenceDiagram
    participant DI as DependencyInjection<br/>(createContainer)
    participant CmdRepo as InMemoryOrderCommandRepo
    participant QryRepo as InMemoryOrderQueryRepo
    participant EvtPub as InMemoryEventPublisher
    participant IdGen as UuidGenerator
    participant CreateH as CreateOrderHandler
    participant ConfirmH as ConfirmOrderHandler
    participant CancelH as CancelOrderHandler
    participant GetH as GetOrderHandler
    participant ListH as ListOrdersHandler
    participant Ctrl as OrderController

    Note over DI: 第一步：建立被驅動適配器（Output）
    DI->>CmdRepo: new InMemoryOrderCommandRepository()
    DI->>QryRepo: new InMemoryOrderQueryRepository()
    DI->>EvtPub: new InMemoryEventPublisher(cmdRepo, qryRepo)
    DI->>IdGen: new UuidGenerator()

    Note over DI: 第二步：建立應用層 Handlers
    DI->>CreateH: new CreateOrderHandler(cmdRepo, evtPub, idGen)
    DI->>ConfirmH: new ConfirmOrderHandler(cmdRepo, evtPub)
    DI->>CancelH: new CancelOrderHandler(cmdRepo, evtPub)
    DI->>GetH: new GetOrderHandler(qryRepo)
    DI->>ListH: new ListOrdersHandler(qryRepo)

    Note over DI: 第三步：建立驅動適配器（Input）
    DI->>Ctrl: new OrderController(createH, getH, listH, confirmH, cancelH)
```

---

## 三大架構概念詳解

### 1. SOLID 原則

SOLID 是五個物件導向設計原則的首字母縮寫，指引我們寫出可維護、可擴展的程式碼。

#### S - Single Responsibility Principle（單一職責原則）

> 一個類別應該只有一個引起它變更的理由。

| 類別 | 職責 | 檔案位置 |
|------|------|---------|
| `Order` | 訂單業務邏輯（狀態轉換、驗證） | `src/domain/models/Order.ts` |
| `OrderItem` | 訂單項目計算（subtotal） | `src/domain/models/OrderItem.ts` |
| `CreateOrderHandler` | 只負責「建立訂單」 | `src/application/commands/CreateOrderHandler.ts` |
| `GetOrderHandler` | 只負責「查詢訂單」 | `src/application/queries/GetOrderHandler.ts` |
| `OrderController` | 只負責「HTTP 請求轉換」 | `src/adapters/input/api/OrderController.ts` |

**反例對照**：如果把建立、查詢、確認、取消全部放在同一個 `OrderService` 中，任何一個操作的變更都會影響整個類別。

#### O - Open/Closed Principle（開放封閉原則）

> 軟體實體應該對擴展開放，對修改封閉。

```typescript
// DomainEvent 介面對擴展開放 ─ 新增事件類型不需修改現有程式碼
interface DomainEvent { eventId; eventType; occurredOn; aggregateId; }

class OrderCreatedEvent   implements DomainEvent { ... }  // 已有
class OrderConfirmedEvent implements DomainEvent { ... }  // 已有
class OrderShippedEvent   implements DomainEvent { ... }  // ← 未來新增，不需改動其他類別
```

#### L - Liskov Substitution Principle（里氏替換原則）

> 子類別必須可以替換其父類別而不影響程式的正確性。

```mermaid
graph LR
    Interface["IdGenerator<br/>(介面)"]
    UUID["UuidGenerator<br/>(生產)"]
    Fixed["FixedIdGenerator<br/>(測試)"]

    Interface -.->|實作| UUID
    Interface -.->|實作| Fixed

    Handler["CreateOrderHandler"]
    Handler -->|依賴| Interface

    style Interface fill:#7ab648,color:#fff
```

`UuidGenerator` 和 `FixedIdGenerator` 都實作 `IdGenerator`，可在任何場景無縫替換。測試時用 `FixedIdGenerator`，生產環境用 `UuidGenerator`。

#### I - Interface Segregation Principle（介面隔離原則）

> 客戶端不應該被迫依賴它不使用的介面。

```mermaid
graph TB
    subgraph "ISP 實踐：拆分為多個小介面"
        CreateUC["CreateOrderUseCase<br/>execute(input)"]
        GetUC["GetOrderUseCase<br/>execute(orderId)"]
        ConfirmUC["ConfirmOrderUseCase<br/>execute(orderId)"]
        CancelUC["CancelOrderUseCase<br/>execute(orderId, reason)"]
    end

    subgraph "ISP 反例：一個大介面"
        BigService["OrderService<br/>createOrder()<br/>getOrder()<br/>confirmOrder()<br/>cancelOrder()<br/>listOrders()"]
    end

    style CreateUC fill:#7ab648,color:#fff
    style GetUC fill:#7ab648,color:#fff
    style ConfirmUC fill:#7ab648,color:#fff
    style CancelUC fill:#7ab648,color:#fff
    style BigService fill:#cc4444,color:#fff
```

同樣，CQRS 中的 `OrderCommandRepository`（寫入）和 `OrderQueryRepository`（讀取）也是 ISP 的體現 ─ 查詢端不需要 `save()` 方法。

#### D - Dependency Inversion Principle（依賴反轉原則）

> 高階模組不應該依賴低階模組，兩者都應該依賴抽象。

```mermaid
graph TB
    subgraph "DIP 實踐（本專案）"
        Handler1["CreateOrderHandler<br/>(高階模組)"]
        Port1["OrderCommandRepository<br/>(抽象介面 - 定義在應用層)"]
        Adapter1["InMemoryOrderCommandRepo<br/>(低階模組)"]

        Handler1 -->|依賴| Port1
        Adapter1 -.->|實作| Port1
    end

    subgraph "DIP 反例"
        Handler2["CreateOrderHandler<br/>(高階模組)"]
        Adapter2["PostgresRepository<br/>(低階模組)"]

        Handler2 -->|直接依賴| Adapter2
    end

    style Port1 fill:#7ab648,color:#fff
    style Handler2 fill:#cc4444,color:#fff
    style Adapter2 fill:#cc4444,color:#fff
```

在 DI Container 中，所有具體類別只在這一處被實例化：

```typescript
// DependencyInjection.ts - 唯一知道所有具體類別的地方
const commandRepo = new InMemoryOrderCommandRepository(); // ← 具體類別
const createOrderHandler = new CreateOrderHandler(
  commandRepo,     // ← 透過 OrderCommandRepository 介面注入
  eventPublisher,  // ← 透過 EventPublisher 介面注入
  idGenerator,     // ← 透過 IdGenerator 介面注入
);
```

---

### 2. 六角形架構 (Hexagonal Architecture)

又稱 **Ports & Adapters** 架構，由 Alistair Cockburn 於 2005 年提出。

#### 核心思想

> 讓應用程式核心與外部世界（UI、資料庫、API）完全隔離，透過「Port（介面）」和「Adapter（適配器）」來溝通。

```mermaid
graph TB
    subgraph Hex["六角形核心"]
        subgraph Domain["Domain"]
            D["Order<br/>OrderItem<br/>DomainEvent"]
        end
        subgraph App["Application"]
            IP["Input Ports<br/>CreateOrderUseCase<br/>GetOrderUseCase<br/>..."]
            OP["Output Ports<br/>OrderCommandRepository<br/>OrderQueryRepository<br/>EventPublisher<br/>IdGenerator"]
            CH["Command Handlers"]
            QH["Query Handlers"]
        end
    end

    subgraph Left["驅動端（左側）"]
        REST["REST Controller"]
        CLI["CLI 程式"]
        Test["自動化測試"]
    end

    subgraph Right["被驅動端（右側）"]
        PG["PostgreSQL"]
        Mem["InMemory"]
        Kafka["Kafka"]
    end

    REST -->|uses| IP
    CLI -->|uses| IP
    Test -->|uses| IP

    OP -.->|implemented by| PG
    OP -.->|implemented by| Mem
    OP -.->|implemented by| Kafka

    style Domain fill:#4a90d9,color:#fff
    style App fill:#7ab648,color:#fff
    style Left fill:#e8943a,color:#fff
    style Right fill:#e8943a,color:#fff
```

#### 三層對應

| 層級 | 別名 | 本專案對應 | 職責 |
|------|------|----------|------|
| **Domain** | 核心 / Entity | `Order`, `OrderItem`, `Product`, `DomainEvent` | 純業務邏輯，零外部依賴 |
| **Application** | Use Cases / Ports | `Ports/`, `Commands/`, `Queries/` | 定義介面、協調業務流程 |
| **Adapters** | Infrastructure | `Controller`, `Repository`, `Publisher` | 與外部技術對接 |

#### Port 與 Adapter 對照表

| Port（介面） | 方向 | Adapter（實作） | 用途 |
|-------------|------|----------------|------|
| `CreateOrderUseCase` | Input | `OrderController` 呼叫 | HTTP → Use Case |
| `GetOrderUseCase` | Input | `OrderController` 呼叫 | HTTP → Use Case |
| `OrderCommandRepository` | Output | `InMemoryOrderCommandRepository` | 持久化寫入 |
| `OrderQueryRepository` | Output | `InMemoryOrderQueryRepository` | 持久化讀取 |
| `EventPublisher` | Output | `InMemoryEventPublisher` | 事件發布 |
| `IdGenerator` | Output | `UuidGenerator` / `FixedIdGenerator` | ID 產生 |

---

### 3. CQRS 模式

由 Greg Young 基於 Bertrand Meyer 的 CQS (Command-Query Separation) 原則提出。

#### 核心思想

> 將「改變狀態的操作（Command）」和「讀取狀態的操作（Query）」分離到不同的模型與路徑中。

```mermaid
graph LR
    subgraph CommandSide["命令端（寫入）"]
        CC["OrderController"]
        CH["Command Handlers<br/>CreateOrderHandler<br/>ConfirmOrderHandler<br/>CancelOrderHandler"]
        DM["Domain Model<br/>Order Aggregate"]
        WS["Command Repository<br/>(Write Store)"]

        CC -->|命令| CH
        CH -->|業務邏輯| DM
        CH -->|persist| WS
    end

    subgraph Sync["同步機制"]
        EP["EventPublisher<br/>事件驅動同步"]
    end

    subgraph QuerySide["查詢端（讀取）"]
        QC["OrderController"]
        QH["Query Handlers<br/>GetOrderHandler<br/>ListOrdersHandler"]
        RM["Read Model<br/>OrderReadModel<br/>(扁平化/非正規化)"]
        RS["Query Repository<br/>(Read Store)"]

        QC -->|查詢| QH
        QH -->|直接讀取| RS
        RS -->|回傳| RM
    end

    WS -->|Domain Events| EP
    EP -->|同步| RS

    style CommandSide fill:#e8943a,color:#fff
    style QuerySide fill:#4a90d9,color:#fff
    style Sync fill:#7ab648,color:#fff
```

#### 寫入模型 vs 讀取模型

| 面向 | Command Model（寫入） | Query Model（讀取） |
|------|---------------------|-------------------|
| **資料結構** | `Order` 聚合根（正規化、封裝業務邏輯） | `OrderReadModel`（扁平化、非正規化） |
| **行為** | `addItem()`, `confirm()`, `cancel()` | 無行為，純資料結構 |
| **驗證** | 嚴格的業務規則驗證 | 不需要驗證 |
| **計算** | 即時計算 `totalAmount` | 預先計算好 `totalAmount` |
| **效能優化** | 事務一致性 | 查詢速度（可加快取、索引等） |
| **儲存庫** | `OrderCommandRepository` | `OrderQueryRepository` |

#### 程式碼比較

**Command Side - 經過完整的 Domain 邏輯：**
```typescript
// CreateOrderHandler.execute()
const order = Order.create(orderId, customerId);     // 建立聚合根
order.addItem(new OrderItem(productId, name, 2500, 1)); // 業務驗證
await this.orderRepository.save(order);               // 寫入 Command Store
await this.eventPublisher.publishAll(order.domainEvents); // 觸發事件 → 同步 Read Model
```

**Query Side - 直接讀取 Read Model，跳過 Domain 邏輯：**
```typescript
// GetOrderHandler.execute()
const readModel = await this.queryRepository.findById(orderId); // 直接讀
return { id: readModel.id, totalAmount: readModel.totalAmount, ... }; // 直接回傳
```

---

## 架構比較與優劣分析

### 六角形架構 vs 傳統三層式架構 vs Clean Architecture

```mermaid
graph TB
    subgraph Traditional["傳統三層式"]
        direction TB
        P1["Presentation"]
        B1["Business Logic"]
        D1["Data Access"]
        P1 --> B1 --> D1
    end

    subgraph Hexagonal["六角形架構"]
        direction TB
        A2["Adapters (Input/Output)"]
        AP2["Application (Ports)"]
        DM2["Domain"]
        A2 --> AP2 --> DM2
    end

    subgraph Clean["Clean Architecture"]
        direction TB
        FW3["Frameworks & Drivers"]
        IA3["Interface Adapters"]
        UC3["Use Cases"]
        E3["Entities"]
        FW3 --> IA3 --> UC3 --> E3
    end

    style Traditional fill:#cc4444,color:#fff
    style Hexagonal fill:#7ab648,color:#fff
    style Clean fill:#4a90d9,color:#fff
```

| 面向 | 傳統三層式 | 六角形架構 | Clean Architecture |
|------|----------|----------|-------------------|
| **核心概念** | UI → Logic → DB | Ports & Adapters | Dependency Rule |
| **依賴方向** | 上層依賴下層 | 外層依賴內層 | 外層依賴內層 |
| **DB 依賴** | Business 直接依賴 DB 層 | 透過 Output Port 抽象 | 透過 Gateway 介面抽象 |
| **可測試性** | 中等（需 mock DB） | 高（Port 可替換） | 高（同六角形） |
| **複雜度** | 低 | 中 | 高（層數更多） |
| **適合規模** | 小型專案 | 中大型專案 | 大型專案 |
| **學習曲線** | 低 | 中 | 高 |

### 六角形架構優劣分析

| | 說明 |
|---|------|
| **優點** | |
| 可測試性極高 | Domain 零依賴，可直接單元測試；Adapter 可輕鬆替換為 InMemory 實作 |
| 技術可替換性 | 更換資料庫只需新增 Adapter，核心不變 |
| 業務邏輯純粹 | Domain 層不受框架、資料庫等技術選擇影響 |
| 關注點分離 | 每一層有明確的職責邊界 |
| 並行開發 | 定義好 Port 介面後，不同團隊可以同時開發各層 |
| **缺點** | |
| 前期成本高 | 需要定義大量介面和適配器，簡單 CRUD 可能過度設計 |
| 學習門檻 | 團隊成員需要理解 Port/Adapter 概念 |
| 間接性增加 | 呼叫鏈變長：Controller → Port → Handler → Domain → Port → Adapter |
| 檔案數量多 | 本專案 23 個原始檔，同樣功能用傳統架構可能只需 5-6 個 |

### CQRS 優劣分析

| | 說明 |
|---|------|
| **優點** | |
| 讀寫獨立擴展 | 讀取端可加 cache/replica，寫入端可垂直擴展 |
| 讀取效能優化 | Read Model 可針對查詢場景非正規化，避免多表 JOIN |
| 模型簡化 | Command Model 專注業務邏輯，Query Model 專注展示需求 |
| 職責清晰 | Command Handler 和 Query Handler 各司其職（SRP） |
| Event Sourcing 基礎 | CQRS 是導入 Event Sourcing 的必要基礎 |
| **缺點** | |
| 複雜度增加 | 需要維護兩套模型和同步機制 |
| 資料一致性 | Read Model 可能存在延遲（最終一致性），不適合強一致性場景 |
| 開發成本 | 每個操作需要分開實作 Command 和 Query 兩端 |
| 偵錯困難 | 事件驅動的同步機制在出錯時較難追蹤 |
| 不適合簡單 CRUD | 讀寫模型幾乎相同時，CQRS 帶來不必要的複雜度 |

### CQRS 三種演進層級

| 層級 | 說明 | 一致性 | 複雜度 | 本專案 |
|------|------|--------|--------|--------|
| **Level 1** | 同一 DB，不同模型 | 強一致 | 低 | ✅ |
| **Level 2** | 不同 DB（如 PostgreSQL + Elasticsearch） | 最終一致 | 中 | |
| **Level 3** | Event Sourcing + Materialized View | 最終一致 | 高 | |

### 何時該用 / 不該用這些架構？

```mermaid
graph TD
    Start["你的專案是？"] --> Q1{"簡單 CRUD？<br/>少量業務邏輯？"}
    Q1 -->|是| A1["傳統三層式即可<br/>不需要六角形/CQRS"]
    Q1 -->|否| Q2{"業務邏輯複雜？<br/>需要長期維護？"}
    Q2 -->|是| A2["採用六角形架構"]
    Q2 -->|否| A1
    A2 --> Q3{"讀寫比例懸殊？<br/>讀寫模型差異大？"}
    Q3 -->|是| A3["加入 CQRS"]
    Q3 -->|否| A4["僅六角形架構<br/>不需 CQRS"]
    A3 --> Q4{"需要事件溯源？<br/>需要審計追蹤？"}
    Q4 -->|是| A5["加入 Event Sourcing"]
    Q4 -->|否| A6["Level 1 CQRS 即可"]

    style A1 fill:#888,color:#fff
    style A2 fill:#7ab648,color:#fff
    style A3 fill:#4a90d9,color:#fff
    style A4 fill:#7ab648,color:#fff
    style A5 fill:#9b59b6,color:#fff
    style A6 fill:#4a90d9,color:#fff
```

---

## 測試

```bash
npm test              # 執行全部測試
npm run test:coverage # 測試覆蓋率
```

### 測試結構總覽

| 測試檔案 | 層級 | 測試目標 | 數量 |
|---------|------|---------|------|
| `Order.test.ts` | Domain | 聚合根、值物件、狀態轉換、事件 | 25 |
| `CreateOrderHandler.test.ts` | Application (Command) | 建立訂單流程、事件發布、讀取模型同步 | 5 |
| `ConfirmAndCancelHandler.test.ts` | Application (Command) | 確認/取消訂單流程 | 5 |
| `GetOrderHandler.test.ts` | Application (Query) | CQRS 查詢端、列表過濾 | 4 |
| `OrderController.test.ts` | Adapter (Integration) | 端到端完整生命週期 | 7 |
| **合計** | | | **46** |

### 為什麼測試這麼容易寫？

```mermaid
graph LR
    subgraph DomainTest["Domain 測試"]
        DT["直接 new Order()<br/>零依賴<br/>零 Mock"]
    end

    subgraph AppTest["Application 測試"]
        AT["注入 InMemory 適配器<br/>不需 Mock<br/>真實行為驗證"]
    end

    subgraph IntegrationTest["整合測試"]
        IT["DI Container 組裝<br/>端到端驗證<br/>完整流程"]
    end

    DomainTest --> AppTest --> IntegrationTest

    style DomainTest fill:#4a90d9,color:#fff
    style AppTest fill:#7ab648,color:#fff
    style IntegrationTest fill:#e8943a,color:#fff
```

- **Domain 測試**：零依賴，直接 `new` 出來就能測
- **Application 測試**：用 `InMemory` 適配器，不需要 Mock，驗證真實行為
- **整合測試**：用 `createContainer()` 組裝所有元件，端到端驗證

---

## 教學文件

詳細的概念說明與程式碼解析，請參考 `docs/` 目錄：

| 文件 | 內容 |
|------|------|
| [SOLID 原則](docs/01-solid-principles.md) | 五大原則詳細說明、程式碼對照、反例分析 |
| [六角形架構](docs/02-hexagonal-architecture.md) | Ports & Adapters 詳解、三層結構、依賴方向 |
| [CQRS 模式](docs/03-cqrs-pattern.md) | 命令查詢分離、讀寫模型、同步機制、三種層級 |

---

## 延伸思考

### 如何擴展此架構？

| 擴展項目 | 做法 | 影響範圍 |
|---------|------|---------|
| 加入 REST API | 建立 Express/Fastify Driving Adapter | 只新增 Adapter，Application/Domain 不變 |
| 換成 PostgreSQL | 實作 `PostgresOrderCommandRepository` | 只新增 Adapter，Application/Domain 不變 |
| 加入 Redis 快取 | 實作帶快取的 `CachedOrderQueryRepository` | 只新增 Adapter |
| 加入 Kafka 訊息佇列 | 實作 `KafkaEventPublisher` | 只新增 Adapter |
| 加入 Event Sourcing | 將 Command Store 改為 Event Store | 新增 Adapter + 修改 EventPublisher |
| 微服務拆分 | Command/Query 部署為獨立服務 | 架構層級的變更 |

### 延伸閱讀

- Alistair Cockburn - Hexagonal Architecture (Ports & Adapters)
- Robert C. Martin - Clean Architecture
- Greg Young - CQRS and Event Sourcing
- Vaughn Vernon - Implementing Domain-Driven Design
- Martin Fowler - CQRS Pattern
