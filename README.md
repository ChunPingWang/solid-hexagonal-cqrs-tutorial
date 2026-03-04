# 六角形架構 + CQRS + SOLID 原則教學

> **Java 21 + Spring Boot 4** 實作範例 — 訂單管理系統

本專案透過一個完整的「訂單管理系統」，示範如何結合 **六角形架構（Hexagonal Architecture / Ports & Adapters）**、**CQRS（Command Query Responsibility Segregation）** 和 **SOLID 原則**，打造高內聚、低耦合、易測試的企業級應用程式。

---

## 目錄

- [技術棧](#技術棧)
- [快速開始](#快速開始)
- [架構圖](#架構圖)
- [類別圖](#類別圖)
- [循序圖](#循序圖)
- [狀態機圖](#狀態機圖)
- [SOLID 原則對照](#solid-原則對照)
- [CQRS 模式詳解](#cqrs-模式詳解)
- [六角形架構詳解](#六角形架構詳解)
- [專案結構](#專案結構)
- [API 端點](#api-端點)
- [測試](#測試)
- [架構優劣比較](#架構優劣比較)
- [Java 21 特性展示](#java-21-特性展示)

---

## 技術棧

| 技術 | 版本 | 用途 |
|------|------|------|
| Java | 21 | Records、Sealed Interfaces、Text Blocks |
| Spring Boot | 4.0.0 | Web 框架、依賴注入、測試 |
| Spring Framework | 7.0 | 核心框架 |
| Maven | 3.9+ | 建構工具 |
| JUnit | 6.0 | 單元測試 |
| AssertJ | 3.27 | 流暢斷言 |
| MockMvc | — | REST 整合測試 |

---

## 快速開始

```bash
# 編譯
mvn compile

# 執行測試（46 個測試）
mvn test

# 啟動應用程式
mvn spring-boot:run

# 建立訂單
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "c1",
    "items": [
      {"productId": "p1", "productName": "鍵盤", "unitPrice": 2500, "quantity": 1},
      {"productId": "p2", "productName": "滑鼠", "unitPrice": 800, "quantity": 2}
    ]
  }'
```

---

## 架構圖

### 整體六角形架構 + CQRS 全景

```mermaid
graph TB
    subgraph External["外部世界"]
        HTTP["HTTP Client / REST API"]
        DB[("未來: Database")]
        MQ["未來: Message Queue"]
    end

    subgraph Driving["驅動適配器 Driving Adapters"]
        REST["OrderRestController<br/>@RestController"]
        EXH["GlobalExceptionHandler<br/>@RestControllerAdvice"]
    end

    subgraph Application["應用層 Application Layer"]
        subgraph InputPorts["輸入埠 Input Ports"]
            COU["CreateOrderUseCase"]
            CFOU["ConfirmOrderUseCase"]
            CAOU["CancelOrderUseCase"]
            GOU["GetOrderUseCase"]
            LOU["ListOrdersUseCase"]
        end

        subgraph CommandHandlers["Command Handlers（寫入端）"]
            COH["CreateOrderHandler"]
            CFOH["ConfirmOrderHandler"]
            CAOH["CancelOrderHandler"]
        end

        subgraph QueryHandlers["Query Handlers（讀取端）"]
            GOH["GetOrderHandler"]
            LOH["ListOrdersHandler"]
        end

        subgraph OutputPorts["輸出埠 Output Ports"]
            OCR["OrderCommandRepository"]
            OQR["OrderQueryRepository"]
            EP["EventPublisher"]
            IG["IdGenerator"]
        end
    end

    subgraph Domain["領域層 Domain Layer"]
        O["Order<br/>Aggregate Root"]
        OI["OrderItem<br/>Value Object (record)"]
        DE["DomainEvent<br/>sealed interface"]
        OS["OrderStatus<br/>enum"]
    end

    subgraph Driven["被驅動適配器 Driven Adapters"]
        IMCR["InMemoryOrderCommandRepository"]
        IMQR["InMemoryOrderQueryRepository"]
        IMEP["InMemoryEventPublisher"]
        UUID["UuidGeneratorAdapter"]
    end

    HTTP --> REST
    REST --> COU & CFOU & CAOU & GOU & LOU
    COU -.-> COH
    CFOU -.-> CFOH
    CAOU -.-> CAOH
    GOU -.-> GOH
    LOU -.-> LOH
    COH --> OCR & EP & IG
    CFOH --> OCR & EP
    CAOH --> OCR & EP
    GOH --> OQR
    LOH --> OQR
    COH --> O
    OCR -.-> IMCR
    OQR -.-> IMQR
    EP -.-> IMEP
    IG -.-> UUID
    IMEP --> IMCR
    IMEP --> IMQR
```

### 依賴方向（DIP 體現）

```mermaid
graph LR
    subgraph "外層 - 基礎設施"
        A["REST Controller<br/>InMemory Repos<br/>EventPublisher Impl<br/>BeanConfiguration"]
    end

    subgraph "中層 - 應用層"
        B["Use Case Interfaces<br/>Handlers<br/>DTOs (records)"]
    end

    subgraph "內層 - 領域層"
        C["Order Aggregate<br/>Domain Events<br/>Value Objects"]
    end

    A -->|依賴| B
    B -->|依賴| C
```

> **關鍵規則**：依賴只能由外層指向內層。Domain 層對 Spring 框架零依賴。

---

## 類別圖

### 領域模型類別圖

```mermaid
classDiagram
    class Order {
        -String id
        -String customerId
        -Instant createdAt
        -List~OrderItem~ items
        -List~DomainEvent~ domainEvents
        -OrderStatus status
        +getId() String
        +getCustomerId() String
        +getStatus() OrderStatus
        +getItems() List~OrderItem~
        +getTotalAmount() double
        +getDomainEvents() List~DomainEvent~
        +addItem(OrderItem) void
        +confirm() void
        +cancel(String) void
        +clearEvents() void
        +create(String, String)$ Order
        +reconstruct(...)$ Order
    }

    class OrderItem {
        <<record>>
        +String productId
        +String productName
        +double unitPrice
        +int quantity
        +subtotal() double
    }

    class OrderStatus {
        <<enumeration>>
        DRAFT
        CONFIRMED
        CANCELLED
    }

    class DomainEvent {
        <<sealed interface>>
        +eventId() String
        +eventType() String
        +occurredOn() Instant
        +aggregateId() String
    }

    class OrderCreatedEvent {
        <<record>>
        +String customerId
        +double totalAmount
    }

    class OrderItemAddedEvent {
        <<record>>
        +String productId
        +int quantity
    }

    class OrderConfirmedEvent {
        <<record>>
    }

    class OrderCancelledEvent {
        <<record>>
        +String reason
    }

    Order *-- OrderItem : contains
    Order --> OrderStatus : has
    Order --> DomainEvent : produces
    DomainEvent <|.. OrderCreatedEvent : implements
    DomainEvent <|.. OrderItemAddedEvent : implements
    DomainEvent <|.. OrderConfirmedEvent : implements
    DomainEvent <|.. OrderCancelledEvent : implements
```

### Ports & Adapters 類別圖

```mermaid
classDiagram
    class CreateOrderUseCase {
        <<interface>>
        +execute(CreateOrderInput) CreateOrderOutput
    }
    class ConfirmOrderUseCase {
        <<interface>>
        +execute(String) ConfirmOrderOutput
    }
    class CancelOrderUseCase {
        <<interface>>
        +execute(String, String) CancelOrderOutput
    }
    class GetOrderUseCase {
        <<interface>>
        +execute(String) OrderView
    }
    class ListOrdersUseCase {
        <<interface>>
        +execute(String) List~OrderView~
    }

    class OrderCommandRepository {
        <<interface>>
        +save(Order) void
        +findById(String) Optional~Order~
    }
    class OrderQueryRepository {
        <<interface>>
        +findById(String) Optional~OrderReadModel~
        +findAll() List~OrderReadModel~
        +findByCustomerId(String) List~OrderReadModel~
    }
    class EventPublisher {
        <<interface>>
        +publish(DomainEvent) void
        +publishAll(List~DomainEvent~) void
    }
    class IdGenerator {
        <<interface>>
        +generate() String
    }

    class CreateOrderHandler
    class InMemoryOrderCommandRepository
    class InMemoryOrderQueryRepository
    class InMemoryEventPublisher
    class UuidGeneratorAdapter

    CreateOrderUseCase <|.. CreateOrderHandler : implements
    OrderCommandRepository <|.. InMemoryOrderCommandRepository : implements
    OrderQueryRepository <|.. InMemoryOrderQueryRepository : implements
    EventPublisher <|.. InMemoryEventPublisher : implements
    IdGenerator <|.. UuidGeneratorAdapter : implements

    CreateOrderHandler --> OrderCommandRepository : uses
    CreateOrderHandler --> EventPublisher : uses
    CreateOrderHandler --> IdGenerator : uses
```

---

## 循序圖

### 建立訂單（Command 流程）

```mermaid
sequenceDiagram
    actor Client
    participant REST as OrderRestController
    participant UC as CreateOrderHandler
    participant IG as IdGenerator
    participant Order as Order
    participant CR as CommandRepository
    participant EP as EventPublisher
    participant QR as QueryRepository

    Client->>REST: POST /api/orders
    REST->>REST: 轉換 Request → Input DTO
    REST->>UC: execute(CreateOrderInput)
    UC->>IG: generate()
    IG-->>UC: orderId (UUID)
    UC->>Order: Order.create(id, customerId)
    Order-->>UC: order (DRAFT)
    loop 每個 OrderItem
        UC->>Order: addItem(item)
        Order->>Order: 產生 OrderItemAddedEvent
    end
    UC->>CR: save(order)
    UC->>EP: publishAll(events)
    EP->>CR: findById(orderId)
    CR-->>EP: order
    EP->>EP: 轉換 Order → ReadModel
    EP->>QR: sync(readModel)
    UC-->>REST: CreateOrderOutput
    REST-->>Client: 201 Created + JSON
```

### 確認訂單（狀態轉換）

```mermaid
sequenceDiagram
    actor Client
    participant REST as OrderRestController
    participant UC as ConfirmOrderHandler
    participant CR as CommandRepository
    participant Order as Order
    participant EP as EventPublisher
    participant QR as QueryRepository

    Client->>REST: POST /api/orders/{id}/confirm
    REST->>UC: execute(orderId)
    UC->>CR: findById(orderId)
    CR-->>UC: Optional~Order~
    UC->>Order: confirm()
    Note over Order: DRAFT → CONFIRMED
    Order->>Order: 產生 OrderConfirmedEvent
    UC->>CR: save(order)
    UC->>EP: publishAll(events)
    EP->>QR: sync(updatedReadModel)
    UC-->>REST: ConfirmOrderOutput
    REST-->>Client: 200 OK + JSON
```

### 查詢訂單（Query 流程 — CQRS 讀取端）

```mermaid
sequenceDiagram
    actor Client
    participant REST as OrderRestController
    participant UC as GetOrderHandler
    participant QR as QueryRepository

    Client->>REST: GET /api/orders/{id}
    REST->>UC: execute(orderId)
    UC->>QR: findById(orderId)
    QR-->>UC: Optional~OrderReadModel~
    UC->>UC: 轉換 ReadModel → OrderView
    UC-->>REST: OrderView
    REST-->>Client: 200 OK + JSON

    Note over UC,QR: Query 端完全不碰 Domain 層！
```

---

## 狀態機圖

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Order.create()
    DRAFT --> DRAFT: addItem()
    DRAFT --> CONFIRMED: confirm()
    DRAFT --> CANCELLED: cancel(reason)
    CONFIRMED --> CANCELLED: cancel(reason)

    DRAFT: 草稿狀態
    DRAFT: ・可新增項目
    DRAFT: ・可確認或取消

    CONFIRMED: 已確認
    CONFIRMED: ・不可新增項目
    CONFIRMED: ・可取消

    CANCELLED: 已取消
    CANCELLED: ・不可再次取消
    CANCELLED: ・不可新增項目
```

---

## SOLID 原則對照

### S — 單一職責原則 (SRP)

| 類別 | 職責 | 變更原因 |
|------|------|----------|
| `Order` | 訂單業務邏輯 | 業務規則變更 |
| `OrderRestController` | HTTP ↔ UseCase 轉換 | API 規格變更 |
| `CreateOrderHandler` | 建立訂單應用邏輯 | 建立流程變更 |
| `GetOrderHandler` | 查詢訂單應用邏輯 | 查詢需求變更 |
| `InMemoryEventPublisher` | 事件發布與 Read Model 同步 | 同步機制變更 |

### O — 開放封閉原則 (OCP)

```mermaid
graph LR
    A["DomainEvent<br/>sealed interface"] --> B["OrderCreatedEvent"]
    A --> C["OrderConfirmedEvent"]
    A --> D["OrderCancelledEvent"]
    A --> E["OrderItemAddedEvent"]
    A -.-> F["未來: OrderShippedEvent"]

    style F fill:#ff9,stroke:#333,stroke-dasharray: 5 5
```

新增事件類型只需新增 `record` 並加入 `permits` 清單，不需修改現有程式碼。

### L — 里氏替換原則 (LSP)

```mermaid
graph TB
    A["IdGenerator<br/>interface"] --> B["UuidGeneratorAdapter<br/>生產環境"]
    A --> C["FixedIdGenerator<br/>測試環境"]

    D["OrderCommandRepository<br/>interface"] --> E["InMemoryOrderCommandRepository"]
    D -.-> F["未來: JpaOrderCommandRepository"]

    style F fill:#ff9,stroke:#333,stroke-dasharray: 5 5
```

### I — 介面隔離原則 (ISP)

```mermaid
graph LR
    subgraph "正確做法 ✅ 五個小介面"
        B["CreateOrderUseCase"]
        C["ConfirmOrderUseCase"]
        D["CancelOrderUseCase"]
        E["GetOrderUseCase"]
        F["ListOrdersUseCase"]
    end

    subgraph "錯誤示範 ❌ 一個大介面"
        A["OrderService<br/>createOrder()<br/>confirmOrder()<br/>cancelOrder()<br/>getOrder()<br/>listOrders()"]
    end
```

CQRS 也是 ISP 的體現：`OrderCommandRepository`（寫入）≠ `OrderQueryRepository`（讀取）。

### D — 依賴反轉原則 (DIP)

```mermaid
graph TB
    subgraph "高層模組"
        H["CreateOrderHandler"]
    end
    subgraph "抽象介面"
        I1["OrderCommandRepository"]
        I2["EventPublisher"]
        I3["IdGenerator"]
    end
    subgraph "低層模組"
        L1["InMemoryOrderCommandRepository"]
        L2["InMemoryEventPublisher"]
        L3["UuidGeneratorAdapter"]
    end
    subgraph "組裝"
        BC["BeanConfiguration<br/>唯一知道具體類別的地方"]
    end

    H -->|依賴| I1 & I2 & I3
    L1 -->|實作| I1
    L2 -->|實作| I2
    L3 -->|實作| I3
    BC -.->|建立並注入| H
```

`BeanConfiguration` 是唯一知道所有具體類別的地方。Domain 和 Application 層對 Spring 框架零依賴。

---

## CQRS 模式詳解

### Command 端 vs Query 端

```mermaid
graph TB
    subgraph "Command 端（寫入）"
        C1["CreateOrderHandler"]
        C2["ConfirmOrderHandler"]
        C3["CancelOrderHandler"]
        CR[("Command Store<br/>ConcurrentHashMap<br/>Order 聚合根")]
    end

    subgraph "事件同步"
        EP["InMemoryEventPublisher<br/>發布事件 + 同步 Read Model"]
    end

    subgraph "Query 端（讀取）"
        Q1["GetOrderHandler"]
        Q2["ListOrdersHandler"]
        QR[("Query Store<br/>ConcurrentHashMap<br/>OrderReadModel")]
    end

    C1 & C2 & C3 --> CR
    C1 & C2 & C3 --> EP
    EP --> QR
    Q1 & Q2 --> QR
```

### 寫入模型 vs 讀取模型

| 面向 | Command 端 | Query 端 |
|------|-----------|----------|
| **資料模型** | `Order`（聚合根） | `OrderReadModel`（record，扁平化） |
| **儲存** | `OrderCommandRepository` | `OrderQueryRepository` |
| **特性** | 包含領域邏輯、狀態驗證 | 無領域邏輯、預計算 |
| **操作** | `save()`, `findById()` | `findById()`, `findAll()`, `findByCustomerId()` |

---

## 六角形架構詳解

### 三層責任

| 層級 | 責任 | Spring 依賴 | 範例 |
|------|------|------------|------|
| **Domain** | 核心業務規則 | ❌ 無 | `Order`, `OrderItem`, `DomainEvent` |
| **Application** | 應用邏輯、Port 定義 | ❌ 無 | `CreateOrderHandler`, Use Case 介面 |
| **Adapter** | 外部技術整合 | ✅ 有 | `OrderRestController`, InMemory 實作 |
| **Infrastructure** | 組裝與配置 | ✅ 有 | `BeanConfiguration` |

### Port 與 Adapter 對照

| Port（介面） | 方向 | Adapter（實作） |
|-------------|------|----------------|
| `CreateOrderUseCase` | Input | `OrderRestController` 呼叫 |
| `OrderCommandRepository` | Output | `InMemoryOrderCommandRepository` |
| `OrderQueryRepository` | Output | `InMemoryOrderQueryRepository` |
| `EventPublisher` | Output | `InMemoryEventPublisher` |
| `IdGenerator` | Output | `UuidGeneratorAdapter` / `FixedIdGenerator` |

---

## 專案結構

```
src/
├── main/java/com/example/hexagonal/
│   ├── HexagonalCqrsApplication.java          # Spring Boot 入口
│   │
│   ├── domain/                                 # 🔴 領域層（零框架依賴）
│   │   ├── model/
│   │   │   ├── Order.java                      #   聚合根（Aggregate Root）
│   │   │   ├── OrderItem.java                  #   值物件 (record)
│   │   │   ├── OrderStatus.java                #   狀態列舉
│   │   │   └── Product.java                    #   產品值物件 (record)
│   │   ├── event/
│   │   │   ├── DomainEvent.java                #   sealed interface
│   │   │   ├── OrderCreatedEvent.java          #   record
│   │   │   ├── OrderItemAddedEvent.java        #   record
│   │   │   ├── OrderConfirmedEvent.java        #   record
│   │   │   └── OrderCancelledEvent.java        #   record
│   │   └── exception/
│   │       ├── DomainException.java
│   │       ├── OrderNotFoundException.java
│   │       ├── InvalidOrderOperationException.java
│   │       └── InvalidOrderItemException.java
│   │
│   ├── application/                            # 🟡 應用層（零框架依賴）
│   │   ├── port/
│   │   │   ├── input/                          #   輸入埠（Use Case 介面）
│   │   │   │   ├── CreateOrderUseCase.java
│   │   │   │   ├── ConfirmOrderUseCase.java
│   │   │   │   ├── CancelOrderUseCase.java
│   │   │   │   ├── GetOrderUseCase.java
│   │   │   │   └── ListOrdersUseCase.java
│   │   │   └── output/                         #   輸出埠
│   │   │       ├── OrderCommandRepository.java
│   │   │       ├── OrderQueryRepository.java
│   │   │       ├── EventPublisher.java
│   │   │       └── IdGenerator.java
│   │   ├── command/                            #   Command Handlers（寫入端）
│   │   │   ├── CreateOrderHandler.java
│   │   │   ├── ConfirmOrderHandler.java
│   │   │   └── CancelOrderHandler.java
│   │   ├── query/                              #   Query Handlers（讀取端）
│   │   │   ├── GetOrderHandler.java
│   │   │   └── ListOrdersHandler.java
│   │   └── dto/                                #   DTO（全部為 record）
│   │       ├── CreateOrderInput.java
│   │       ├── CreateOrderOutput.java
│   │       ├── OrderItemInput.java
│   │       ├── OrderItemView.java
│   │       ├── OrderView.java
│   │       ├── OrderReadModel.java
│   │       ├── ConfirmOrderOutput.java
│   │       └── CancelOrderOutput.java
│   │
│   ├── adapter/                                # 🟢 適配器層
│   │   ├── input/rest/                         #   驅動適配器
│   │   │   ├── OrderRestController.java
│   │   │   ├── GlobalExceptionHandler.java
│   │   │   └── dto/
│   │   │       ├── CreateOrderRequest.java
│   │   │       └── CancelOrderRequest.java
│   │   └── output/                             #   被驅動適配器
│   │       ├── persistence/
│   │       │   ├── InMemoryOrderCommandRepository.java
│   │       │   └── InMemoryOrderQueryRepository.java
│   │       ├── messaging/
│   │       │   └── InMemoryEventPublisher.java
│   │       ├── UuidGeneratorAdapter.java
│   │       └── FixedIdGenerator.java
│   │
│   └── infrastructure/config/                  # ⚙️ 基礎設施
│       └── BeanConfiguration.java              #   DI 容器
│
└── test/java/com/example/hexagonal/
    ├── domain/model/
    │   └── OrderTest.java                      # 25 個領域測試
    ├── application/
    │   ├── command/
    │   │   ├── CreateOrderHandlerTest.java     # 5 個 Command 測試
    │   │   └── ConfirmAndCancelHandlerTest.java # 5 個狀態轉換測試
    │   └── query/
    │       └── GetOrderHandlerTest.java        # 4 個 Query 測試
    └── adapter/input/rest/
        └── OrderRestControllerTest.java        # 7 個 Spring Boot 整合測試
```

---

## API 端點

| 方法 | 路徑 | 說明 | 回應碼 |
|------|------|------|--------|
| `POST` | `/api/orders` | 建立訂單 | `201 Created` |
| `GET` | `/api/orders/{id}` | 查詢訂單 | `200 OK` / `404` |
| `GET` | `/api/orders` | 列出所有訂單 | `200 OK` |
| `GET` | `/api/orders?customerId=xxx` | 依客戶篩選 | `200 OK` |
| `POST` | `/api/orders/{id}/confirm` | 確認訂單 | `200 OK` |
| `POST` | `/api/orders/{id}/cancel` | 取消訂單 | `200 OK` |

---

## 測試

### 46 個測試，涵蓋三個層級

| 測試類別 | 數量 | 層級 | 類型 |
|----------|------|------|------|
| `OrderTest` | 25 | Domain | 純單元測試（零框架依賴） |
| `CreateOrderHandlerTest` | 5 | Application | 單元測試 |
| `ConfirmAndCancelHandlerTest` | 5 | Application | 單元測試 |
| `GetOrderHandlerTest` | 4 | Application (CQRS) | 單元測試 |
| `OrderRestControllerTest` | 7 | Adapter | Spring Boot 整合測試 |

```bash
mvn test
```

---

## 架構優劣比較

### 六角形架構 vs 傳統分層架構

| 面向 | 六角形架構 | 傳統分層架構 |
|------|-----------|-------------|
| **依賴方向** | 外 → 內（DIP） | 上 → 下 |
| **框架耦合** | 核心無框架依賴 | 各層可能依賴框架 |
| **可測試性** | 極高（純單元測試） | 需 Mock 框架 |
| **可替換性** | 適配器可獨立替換 | 替換需修改多層 |
| **學習成本** | 較高 | 較低 |
| **適用場景** | 複雜領域、長期維護 | 簡單 CRUD |

### CQRS vs 傳統 CRUD

| 面向 | CQRS | 傳統 CRUD |
|------|------|----------|
| **資料模型** | 讀寫分離 | 單一模型 |
| **查詢效能** | 可獨立優化 | 受限於寫入模型 |
| **擴展性** | 讀寫獨立擴展 | 一起擴展 |
| **複雜度** | 需要同步機制 | 簡單直接 |
| **一致性** | 最終一致性 | 強一致性 |

### 何時選擇此架構？

```mermaid
graph TD
    Start["你的專案是？"] --> Q1{"簡單 CRUD？"}
    Q1 -->|是| A1["傳統分層即可"]
    Q1 -->|否| Q2{"業務邏輯複雜？<br/>需要長期維護？"}
    Q2 -->|是| A2["採用六角形架構"]
    Q2 -->|否| A1
    A2 --> Q3{"讀寫比例懸殊？"}
    Q3 -->|是| A3["加入 CQRS"]
    Q3 -->|否| A4["僅六角形架構"]
```

---

## Java 21 特性展示

| 特性 | 使用位置 | 說明 |
|------|----------|------|
| **Records** | DTO、Value Objects、Events | 不可變資料類別 |
| **Sealed Interfaces** | `DomainEvent` | 限制子類型，編譯期型別安全 |
| **Text Blocks** | 測試 JSON | 多行字串 |
| **Virtual Threads** | `application.yml` | `spring.threads.virtual.enabled: true` |

---

## 授權

本專案僅供教學用途。
