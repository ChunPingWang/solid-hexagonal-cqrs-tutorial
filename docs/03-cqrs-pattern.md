# CQRS 模式 (Command Query Responsibility Segregation)

## 命令查詢職責分離

由 Greg Young 基於 Bertrand Meyer 的 CQS (Command-Query Separation) 原則所提出。

---

## 核心思想

> **將「改變狀態的操作（Command）」和「讀取狀態的操作（Query）」分離到不同的模型與路徑中。**

```mermaid
graph LR
    subgraph Traditional["傳統架構"]
        M["統一的 Model"]
        DB1["同一個 DB"]
        M --> DB1
    end

    subgraph CQRS_Arch["CQRS 架構"]
        CM["Command Model<br/>(寫入模型)"]
        QM["Query Model<br/>(讀取模型)"]
        WDB["Write Store"]
        RDB["Read Store"]
        CM --> WDB
        QM --> RDB
        WDB -.->|同步| RDB
    end

    style Traditional fill:#cc4444,color:#fff
    style CQRS_Arch fill:#7ab648,color:#fff
```

---

## 為什麼需要 CQRS？

### 問題：讀寫需求的矛盾

```mermaid
graph TB
    subgraph Write["寫入端需求"]
        W1["正規化資料模型<br/>（避免冗餘）"]
        W2["嚴格業務規則驗證"]
        W3["事務一致性"]
        W4["垂直擴展"]
    end

    subgraph Read["讀取端需求"]
        R1["非正規化資料<br/>（避免 JOIN）"]
        R2["幾乎不需要驗證"]
        R3["查詢速度"]
        R4["水平擴展<br/>（讀取遠多於寫入）"]
    end

    Conflict["需求矛盾！<br/>一個 Model 無法同時滿足"]
    Write --> Conflict
    Read --> Conflict
    Conflict --> Solution["解決方案：CQRS<br/>拆分為兩個 Model"]

    style Conflict fill:#cc4444,color:#fff
    style Solution fill:#7ab648,color:#fff
```

| 面向 | 寫入端 | 讀取端 |
|------|--------|--------|
| 資料模型 | 正規化（避免冗餘） | 非正規化（避免 JOIN） |
| 效能優化 | 事務一致性 | 查詢速度 |
| 擴展方式 | 垂直擴展 | 水平擴展（讀取通常遠多於寫入） |
| 驗證需求 | 嚴格的業務規則 | 幾乎不需要 |
| 運算複雜度 | 高（業務邏輯） | 低（直接讀取） |

---

## 本專案中的 CQRS 實作

### 完整 CQRS 資料流

```mermaid
graph TB
    subgraph CommandFlow["Command Side（寫入端）"]
        direction TB
        C_Ctrl["OrderController"]
        C_Handler["Command Handlers<br/>CreateOrderHandler<br/>ConfirmOrderHandler<br/>CancelOrderHandler"]
        C_Domain["Domain Model<br/>Order Aggregate Root"]
        C_Repo["OrderCommandRepository<br/>(Write Store)"]

        C_Ctrl -->|命令| C_Handler
        C_Handler -->|業務邏輯| C_Domain
        C_Handler -->|persist| C_Repo
    end

    subgraph Sync["同步機制"]
        EvtPub["EventPublisher<br/>事件驅動同步"]
    end

    subgraph QueryFlow["Query Side（讀取端）"]
        direction TB
        Q_Ctrl["OrderController"]
        Q_Handler["Query Handlers<br/>GetOrderHandler<br/>ListOrdersHandler"]
        Q_Repo["OrderQueryRepository<br/>(Read Store)"]
        Q_ReadModel["OrderReadModel<br/>扁平化/非正規化"]

        Q_Ctrl -->|查詢| Q_Handler
        Q_Handler -->|直接讀取| Q_Repo
        Q_Repo --> Q_ReadModel
    end

    C_Repo -->|Domain Events| EvtPub
    EvtPub -->|同步 Read Model| Q_Repo

    style CommandFlow fill:#e8943a,color:#fff
    style QueryFlow fill:#4a90d9,color:#fff
    style Sync fill:#7ab648,color:#fff
```

### Command Side（命令端 / 寫入端）

**相關檔案：**

```
src/application/commands/
├── CreateOrderHandler.ts    ← 建立訂單（Command）
├── ConfirmOrderHandler.ts   ← 確認訂單（Command）
└── CancelOrderHandler.ts    ← 取消訂單（Command）

src/application/ports/output/
└── OrderRepository.ts
    └── OrderCommandRepository  ← 寫入端儲存庫介面
```

**寫入端使用完整的 Domain Model（Order 聚合根）：**

```typescript
// CreateOrderHandler.ts - 經過完整的業務邏輯
async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
  const orderId = this.idGenerator.generate();
  const order = Order.create(orderId, input.customerId);  // ← Domain Model
  for (const item of input.items) {
    order.addItem(new OrderItem(...));  // ← 業務驗證在 Domain 中
  }
  await this.orderRepository.save(order);       // ← 寫入 Command Store
  await this.eventPublisher.publishAll([...]);   // ← 發布事件 → 觸發同步
}
```

### Query Side（查詢端 / 讀取端）

**相關檔案：**

```
src/application/queries/
└── GetOrderHandler.ts       ← 查詢訂單（Query）

src/application/ports/output/
└── OrderRepository.ts
    └── OrderQueryRepository    ← 讀取端儲存庫介面
```

**讀取端使用簡單的 Read Model（純資料結構）：**

```typescript
// GetOrderHandler.ts - 直接讀取，跳過 Domain 邏輯
async execute(orderId: string): Promise<OrderView> {
  const readModel = await this.queryRepository.findById(orderId);
  // 不需要 Domain Model，不需要業務邏輯計算
  // Read Model 的 totalAmount 已經預先計算好
  return { id: readModel.id, totalAmount: readModel.totalAmount, ... };
}
```

### 寫入模型 vs 讀取模型比較

```mermaid
graph LR
    subgraph WriteModel["Command Model（寫入模型）"]
        direction TB
        WM["Order Aggregate Root"]
        WM1["封裝業務邏輯"]
        WM2["狀態轉換驗證"]
        WM3["即時計算 totalAmount"]
        WM4["產生 Domain Events"]
    end

    subgraph ReadModel["Query Model（讀取模型）"]
        direction TB
        RM["OrderReadModel"]
        RM1["純資料結構"]
        RM2["無業務邏輯"]
        RM3["預先計算好 totalAmount"]
        RM4["扁平化、可直接回前端"]
    end

    style WriteModel fill:#e8943a,color:#fff
    style ReadModel fill:#4a90d9,color:#fff
```

```typescript
// Write Model - 正規化、封裝業務邏輯
class Order {
  private _items: OrderItem[] = [];
  private _status: OrderStatus = OrderStatus.DRAFT;

  get totalAmount(): number {
    return this._items.reduce((sum, item) => sum + item.subtotal, 0); // 即時計算
  }

  addItem(item: OrderItem): void {
    if (this._status !== OrderStatus.DRAFT) { throw ... }  // 業務驗證
    this._items.push(item);
  }
}

// Read Model - 非正規化、純資料結構
interface OrderReadModel {
  id: string;
  customerId: string;
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;    // ← 預先計算好
  }>;
  totalAmount: number;   // ← 預先計算好
  status: string;
  createdAt: string;
}
```

---

## 讀寫模型的同步

本專案使用**事件驅動的同步機制**：

```mermaid
sequenceDiagram
    participant Handler as Command Handler
    participant CmdRepo as Command Repository
    participant EvtPub as EventPublisher
    participant QryRepo as Query Repository

    Handler->>CmdRepo: save(order)
    Note over CmdRepo: 寫入 Write Store

    Handler->>EvtPub: publishAll(domainEvents)
    activate EvtPub

    EvtPub->>CmdRepo: findById(orderId)
    CmdRepo-->>EvtPub: order (最新狀態)

    Note over EvtPub: 將 Domain Model<br/>轉換為 Read Model<br/>（扁平化、預先計算）

    EvtPub->>QryRepo: sync(orderReadModel)
    Note over QryRepo: 更新 Read Store

    deactivate EvtPub
```

**程式碼（InMemoryEventPublisher.ts）：**

```typescript
async publish(event: DomainEvent): Promise<void> {
  this.publishedEvents.push(event);
  await this.syncReadModel(event.aggregateId);  // ← 同步讀取模型
}

private async syncReadModel(orderId: string): Promise<void> {
  const order = await this.commandRepo.findById(orderId);
  if (!order) return;

  const readModel: OrderReadModel = {
    id: order.id,
    customerId: order.customerId,
    items: order.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,        // ← 預先計算好
    })),
    totalAmount: order.totalAmount,    // ← 預先計算好
    status: order.status,
    createdAt: order.createdAt.toISOString(),
  };

  this.queryRepo.sync(readModel);
}
```

---

## CQRS 的三種演進層級

```mermaid
graph TB
    subgraph Level1["Level 1：同一 DB，不同模型（本專案）"]
        direction LR
        L1_CH["Command Handler"]
        L1_QH["Query Handler"]
        L1_CR["Command Repo"]
        L1_QR["Query Repo"]
        L1_DB["同一個<br/>In-Memory Store"]

        L1_CH --> L1_CR
        L1_QH --> L1_QR
        L1_CR -->|同步| L1_QR
        L1_CR --> L1_DB
        L1_QR --> L1_DB
    end

    subgraph Level2["Level 2：不同 DB"]
        direction LR
        L2_CH["Command Handler"]
        L2_QH["Query Handler"]
        L2_CR["Command Repo"]
        L2_QR["Query Repo"]
        L2_WDB["PostgreSQL<br/>（寫入優化）"]
        L2_RDB["Elasticsearch<br/>（讀取優化）"]
        L2_Bus["Event Bus<br/>（異步）"]

        L2_CH --> L2_CR --> L2_WDB
        L2_QH --> L2_QR --> L2_RDB
        L2_WDB -->|events| L2_Bus -->|projection| L2_RDB
    end

    subgraph Level3["Level 3：Event Sourcing + CQRS"]
        direction LR
        L3_CH["Command Handler"]
        L3_QH["Query Handler"]
        L3_ES["Event Store<br/>（只儲存事件）"]
        L3_MV["Materialized View<br/>（物化視圖）"]
        L3_Proj["Event Projection"]

        L3_CH --> L3_ES
        L3_ES -->|replay| L3_Proj -->|build| L3_MV
        L3_QH --> L3_MV
    end

    style Level1 fill:#7ab648,color:#fff
    style Level2 fill:#4a90d9,color:#fff
    style Level3 fill:#9b59b6,color:#fff
```

| 層級 | 說明 | 一致性 | 複雜度 | 本專案 |
|------|------|--------|--------|--------|
| **Level 1** | 同一 DB，不同模型 | 強一致 | 低 | ✅ |
| **Level 2** | 不同 DB（如 PostgreSQL + Elasticsearch） | 最終一致 | 中 | |
| **Level 3** | Event Sourcing + Materialized View | 最終一致 | 高 | |

---

## 完整循序圖：建立訂單

```mermaid
sequenceDiagram
    actor User as 使用者
    participant Ctrl as OrderController
    participant Handler as CreateOrderHandler
    participant IdGen as IdGenerator
    participant Order as Order (Aggregate)
    participant CmdRepo as CommandRepository
    participant EvtPub as EventPublisher
    participant QryRepo as QueryRepository

    User->>Ctrl: POST /orders {customerId, items}
    Ctrl->>Handler: execute(input)

    Handler->>IdGen: generate()
    IdGen-->>Handler: "order-uuid-123"

    Handler->>Order: Order.create("order-uuid-123", "c1")
    Note over Order: 產生 OrderCreatedEvent

    loop 每個項目
        Handler->>Order: addItem(new OrderItem(...))
        Note over Order: 驗證 DRAFT 狀態<br/>計算 subtotal<br/>產生 OrderItemAddedEvent
    end

    Handler->>CmdRepo: save(order)
    Note over CmdRepo: 序列化並儲存至 Write Store

    Handler->>EvtPub: publishAll(domainEvents)
    activate EvtPub

    loop 每個事件
        EvtPub->>CmdRepo: findById(orderId)
        CmdRepo-->>EvtPub: order (最新狀態)
        EvtPub->>QryRepo: sync(readModel)
        Note over QryRepo: 更新 Read Store<br/>預先計算 totalAmount
    end

    deactivate EvtPub

    Handler->>Order: clearEvents()
    Handler-->>Ctrl: {orderId, totalAmount, status}
    Ctrl-->>User: {success: true, data: {...}}
```

## 完整循序圖：查詢訂單

```mermaid
sequenceDiagram
    actor User as 使用者
    participant Ctrl as OrderController
    participant Handler as GetOrderHandler
    participant QryRepo as QueryRepository

    User->>Ctrl: GET /orders/:id
    Ctrl->>Handler: execute(orderId)

    Handler->>QryRepo: findById(orderId)
    Note over QryRepo: 直接讀取 Read Model<br/>不經過 Domain Model<br/>totalAmount 已預先計算

    QryRepo-->>Handler: OrderReadModel
    Handler-->>Ctrl: OrderView
    Ctrl-->>User: {success: true, data: {...}}

    Note over Handler: 查詢端完全不碰<br/>Command Repository<br/>也不碰 Domain Model
```

---

## CQRS 與 SOLID 原則的關係

```mermaid
graph TB
    CQRS["CQRS 模式"]

    SRP["SRP<br/>Command/Query Handler<br/>各自只負責一個操作"]
    OCP["OCP<br/>新增查詢方式<br/>不需修改命令處理器"]
    LSP["LSP<br/>CommandRepo/QueryRepo<br/>可隨意替換實作"]
    ISP["ISP<br/>讀寫分離為不同介面<br/>CommandRepo vs QueryRepo"]
    DIP["DIP<br/>Handler 依賴 Repo 介面<br/>不依賴具體實作"]

    CQRS --> SRP & OCP & LSP & ISP & DIP

    style CQRS fill:#7ab648,color:#fff
    style SRP fill:#e74c3c,color:#fff
    style OCP fill:#f39c12,color:#fff
    style LSP fill:#2ecc71,color:#fff
    style ISP fill:#3498db,color:#fff
    style DIP fill:#9b59b6,color:#fff
```

| SOLID 原則 | CQRS 中的體現 |
|-----------|--------------|
| **SRP** | `CreateOrderHandler` 只管建立；`GetOrderHandler` 只管查詢 |
| **OCP** | 新增查詢（如按日期篩選）不需修改命令端 |
| **LSP** | `InMemoryQueryRepo` 可被 `ElasticsearchQueryRepo` 替換 |
| **ISP** | `OrderCommandRepository` 與 `OrderQueryRepository` 完全分離 |
| **DIP** | Handler 依賴 Repository 介面，DI Container 注入具體實作 |

---

## CQRS 優劣分析

| | 說明 |
|---|------|
| **優點** | |
| 讀寫獨立擴展 | 讀取端可加 cache/replica，寫入端可垂直擴展 |
| 讀取效能優化 | Read Model 可非正規化，預先計算，避免 JOIN |
| 模型簡化 | Command Model 專注業務邏輯，Query Model 專注展示 |
| 職責清晰 | Command/Query Handler 各司其職（SRP） |
| Event Sourcing 基礎 | CQRS 是 Event Sourcing 的必要基礎 |
| **缺點** | |
| 複雜度增加 | 需要維護兩套模型和同步機制 |
| 最終一致性 | Read Model 可能存在延遲（Level 2+） |
| 開發成本 | 每個操作需分開實作 Command 和 Query |
| 偵錯困難 | 事件驅動同步出錯時較難追蹤 |
| 不適合簡單 CRUD | 讀寫模型幾乎相同時是多此一舉 |

---

## 適用場景

```mermaid
graph TD
    Q1{"讀寫比例懸殊？<br/>讀 >> 寫？"}
    Q1 -->|否| Q2{"讀寫模型差異大？"}
    Q1 -->|是| UseIt["適合使用 CQRS"]

    Q2 -->|否| DontUse["不需要 CQRS<br/>統一模型即可"]
    Q2 -->|是| UseIt

    UseIt --> Q3{"需要事件溯源？<br/>需要審計追蹤？"}
    Q3 -->|否| Level1["Level 1 CQRS<br/>同一 DB 不同模型"]
    Q3 -->|是| Level3["Level 3<br/>Event Sourcing + CQRS"]

    style UseIt fill:#7ab648,color:#fff
    style DontUse fill:#888,color:#fff
    style Level1 fill:#4a90d9,color:#fff
    style Level3 fill:#9b59b6,color:#fff
```

### 適合使用 CQRS

- 讀寫比例懸殊（讀取 >> 寫入）
- 讀寫需要不同的資料模型
- 需要獨立擴展讀取和寫入
- 複雜的業務邏輯（Command Side）
- 多樣的查詢需求（Query Side）
- 需要事件溯源或審計追蹤

### 不適合使用 CQRS

- 簡單的 CRUD 應用
- 讀寫模型幾乎相同
- 強一致性需求（不能容忍延遲）
- 團隊對此模式不熟悉（學習成本高）
- 專案規模小、生命週期短
