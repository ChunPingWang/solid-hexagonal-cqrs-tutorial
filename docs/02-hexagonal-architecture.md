# 六角形架構 (Hexagonal Architecture)

## 又稱：Ports and Adapters 架構

由 Alistair Cockburn 於 2005 年提出。

---

## 核心思想

> **將應用程式的核心邏輯與外部世界完全隔離。**

外部世界包括：使用者介面、資料庫、訊息佇列、第三方 API 等。
核心邏輯不應該知道這些外部技術的存在。

---

## 架構圖

### 六角形全景

```mermaid
graph TB
    subgraph External_Left["外部世界（驅動端）"]
        User["使用者 / API Client"]
        CLI["CLI 程式"]
        Test["自動化測試"]
        MsgIn["訊息佇列消費者"]
    end

    subgraph Driving["Driving Adapters（驅動適配器）"]
        Controller["OrderController<br/>REST API"]
    end

    subgraph InputPorts["Input Ports（輸入端口）"]
        CreateUC["CreateOrderUseCase"]
        GetUC["GetOrderUseCase"]
        ConfirmUC["ConfirmOrderUseCase"]
        CancelUC["CancelOrderUseCase"]
    end

    subgraph Core["Application Core（應用核心）"]
        subgraph Handlers["Use Case Handlers"]
            CreateH["CreateOrderHandler"]
            GetH["GetOrderHandler"]
            ConfirmH["ConfirmOrderHandler"]
            CancelH["CancelOrderHandler"]
        end

        subgraph DomainCore["Domain Layer"]
            Order["Order<br/>Aggregate Root"]
            OrderItem["OrderItem<br/>Value Object"]
            Events["Domain Events"]
        end
    end

    subgraph OutputPorts["Output Ports（輸出端口）"]
        CmdRepoP["OrderCommandRepository"]
        QryRepoP["OrderQueryRepository"]
        EvtPubP["EventPublisher"]
        IdGenP["IdGenerator"]
    end

    subgraph Driven["Driven Adapters（被驅動適配器）"]
        InMemCmd["InMemoryOrderCommandRepo"]
        InMemQry["InMemoryOrderQueryRepo"]
        InMemEvt["InMemoryEventPublisher"]
        UuidGen["UuidGenerator"]
    end

    subgraph External_Right["外部世界（被驅動端）"]
        DB["資料庫"]
        MQ["訊息佇列"]
    end

    User --> Controller
    CLI -.-> InputPorts
    Test -.-> InputPorts

    Controller --> CreateUC & GetUC & ConfirmUC & CancelUC

    CreateUC -.->|impl| CreateH
    GetUC -.->|impl| GetH
    ConfirmUC -.->|impl| ConfirmH
    CancelUC -.->|impl| CancelH

    CreateH --> Order & OrderItem
    ConfirmH --> Order
    CancelH --> Order
    Order --> Events

    CreateH --> CmdRepoP & EvtPubP & IdGenP
    ConfirmH --> CmdRepoP & EvtPubP
    CancelH --> CmdRepoP & EvtPubP
    GetH --> QryRepoP

    CmdRepoP -.->|impl| InMemCmd
    QryRepoP -.->|impl| InMemQry
    EvtPubP -.->|impl| InMemEvt
    IdGenP -.->|impl| UuidGen

    InMemCmd --> DB
    InMemEvt --> MQ

    style DomainCore fill:#4a90d9,color:#fff
    style Core fill:#5dade2,color:#fff
    style InputPorts fill:#7ab648,color:#fff
    style OutputPorts fill:#7ab648,color:#fff
    style Driving fill:#e8943a,color:#fff
    style Driven fill:#e8943a,color:#fff
```

### 依賴方向（核心規則）

```mermaid
graph LR
    A["Adapters<br/>（最外層）<br/>知道具體技術"]
    B["Application<br/>（中間層）<br/>知道介面與領域"]
    C["Domain<br/>（最內層）<br/>零外部依賴"]

    A -->|依賴| B -->|依賴| C

    C x-->|絕不依賴| B
    B x-->|絕不依賴| A

    style A fill:#e8943a,color:#fff
    style B fill:#7ab648,color:#fff
    style C fill:#4a90d9,color:#fff
```

> **關鍵規則**：依賴只能由外層指向內層。Domain 層不 import 任何 Application 或 Adapter 的東西。

---

## 三層結構

### 1. Domain（領域層）— 最內層

```
src/domain/
├── models/
│   ├── Order.ts        ← 聚合根，封裝業務規則
│   ├── OrderItem.ts    ← 值物件
│   └── Product.ts      ← 值物件
├── events/
│   └── DomainEvent.ts  ← 領域事件
└── errors/
    └── DomainError.ts  ← 領域錯誤
```

**特點：**
- 零外部依賴（不依賴任何框架或基礎設施）
- 純粹的業務邏輯
- 可以用純單元測試驗證
- 是整個系統中最穩定的部分

```mermaid
classDiagram
    class Order {
        +string id
        +string customerId
        +items: OrderItem[]
        +status: OrderStatus
        +totalAmount: number
        +addItem(item)
        +confirm()
        +cancel(reason)
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

    Order "1" *-- "*" OrderItem
    note for Order "純業務邏輯\n零外部依賴\n可直接單元測試"
```

### 2. Application（應用層）— 中間層

```
src/application/
├── ports/
│   ├── input/          ← Input Ports（外界呼叫我）
│   │   ├── CreateOrderUseCase.ts
│   │   ├── GetOrderUseCase.ts
│   │   ├── ConfirmOrderUseCase.ts
│   │   └── CancelOrderUseCase.ts
│   └── output/         ← Output Ports（我呼叫外界）
│       ├── OrderRepository.ts
│       ├── EventPublisher.ts
│       └── IdGenerator.ts
├── commands/           ← Command Handlers
│   ├── CreateOrderHandler.ts
│   ├── ConfirmOrderHandler.ts
│   └── CancelOrderHandler.ts
└── queries/            ← Query Handlers
    └── GetOrderHandler.ts
```

**特點：**
- 定義 Ports（介面）
- 實作 Use Cases（用例）
- 協調領域物件的互動
- 只依賴 Domain 層和 Port 介面

### 3. Adapters（適配器層）— 最外層

```
src/adapters/
├── input/              ← Driving Adapters（驅動）
│   └── api/
│       └── OrderController.ts
└── output/             ← Driven Adapters（被驅動）
    ├── persistence/
    │   ├── InMemoryOrderCommandRepository.ts
    │   └── InMemoryOrderQueryRepository.ts
    ├── messaging/
    │   └── InMemoryEventPublisher.ts
    └── IdGeneratorAdapter.ts
```

**特點：**
- 將外部技術轉換為內部可理解的形式
- 實作 Output Port 介面
- 呼叫 Input Port 介面
- 是唯一依賴具體技術的地方

---

## Ports 與 Adapters 詳解

### Input Ports vs Output Ports

```mermaid
graph LR
    subgraph InputPorts["Input Ports（驅動端）"]
        direction TB
        IP1["CreateOrderUseCase"]
        IP2["GetOrderUseCase"]
        IP3["ConfirmOrderUseCase"]
        IP4["CancelOrderUseCase"]
    end

    subgraph OutputPorts["Output Ports（被驅動端）"]
        direction TB
        OP1["OrderCommandRepository"]
        OP2["OrderQueryRepository"]
        OP3["EventPublisher"]
        OP4["IdGenerator"]
    end

    DA["Driving Adapter<br/>(OrderController)"]
    DA -->|呼叫| InputPorts
    OutputPorts -->|被呼叫| DrivenA["Driven Adapters<br/>(InMemory Repos)"]

    Note1["Input Port: 定義「外界可以對我做什麼」"]
    Note2["Output Port: 定義「我需要外界提供什麼」"]

    style InputPorts fill:#7ab648,color:#fff
    style OutputPorts fill:#4a90d9,color:#fff
```

| 比較 | Input Port | Output Port |
|------|-----------|-------------|
| **方向** | 外界 → 核心 | 核心 → 外界 |
| **定義者** | Application 層 | Application 層 |
| **實作者** | Application 層的 Handler | Adapter 層的具體類別 |
| **呼叫者** | Driving Adapter (Controller) | Application 層的 Handler |
| **範例** | `CreateOrderUseCase` | `OrderCommandRepository` |
| **角色** | 「我提供什麼服務」 | 「我需要什麼服務」 |

### Port ↔ Adapter 對照表

| Port（介面） | 方向 | Adapter（實作） | 用途 |
|-------------|------|----------------|------|
| `CreateOrderUseCase` | Input | `OrderController` 呼叫 | HTTP → Use Case |
| `GetOrderUseCase` | Input | `OrderController` 呼叫 | HTTP → Use Case |
| `ListOrdersUseCase` | Input | `OrderController` 呼叫 | HTTP → Use Case |
| `ConfirmOrderUseCase` | Input | `OrderController` 呼叫 | HTTP → Use Case |
| `CancelOrderUseCase` | Input | `OrderController` 呼叫 | HTTP → Use Case |
| `OrderCommandRepository` | Output | `InMemoryOrderCommandRepository` | 持久化寫入 |
| `OrderQueryRepository` | Output | `InMemoryOrderQueryRepository` | 持久化讀取 |
| `EventPublisher` | Output | `InMemoryEventPublisher` | 事件發布 |
| `IdGenerator` | Output | `UuidGenerator` / `FixedIdGenerator` | ID 產生 |

---

## 完整依賴方向圖

```mermaid
graph TB
    subgraph Adapter["Adapter Layer"]
        Ctrl["OrderController"]
        InMemCmd["InMemoryOrderCommandRepo"]
        InMemQry["InMemoryOrderQueryRepo"]
        InMemEvt["InMemoryEventPublisher"]
        UuidGen["UuidGenerator"]
    end

    subgraph Application["Application Layer"]
        CreateH["CreateOrderHandler"]
        ConfirmH["ConfirmOrderHandler"]
        CancelH["CancelOrderHandler"]
        GetH["GetOrderHandler"]
        ListH["ListOrdersHandler"]

        CreateUC["CreateOrderUseCase"]
        ConfirmUC["ConfirmOrderUseCase"]
        CancelUC["CancelOrderUseCase"]
        GetUC["GetOrderUseCase"]
        ListUC["ListOrdersUseCase"]

        CmdRepoP["OrderCommandRepository"]
        QryRepoP["OrderQueryRepository"]
        EvtPubP["EventPublisher"]
        IdGenP["IdGenerator"]
    end

    subgraph Domain["Domain Layer"]
        Order["Order"]
        OrderItem["OrderItem"]
        DomainEvent["DomainEvent"]
        DomainError["DomainError"]
    end

    Ctrl -->|uses| CreateUC & GetUC & ConfirmUC & CancelUC & ListUC

    CreateUC -.->|implemented by| CreateH
    ConfirmUC -.->|implemented by| ConfirmH
    CancelUC -.->|implemented by| CancelH
    GetUC -.->|implemented by| GetH
    ListUC -.->|implemented by| ListH

    CreateH -->|uses| CmdRepoP & EvtPubP & IdGenP
    CreateH -->|uses| Order & OrderItem
    ConfirmH -->|uses| CmdRepoP & EvtPubP & Order
    CancelH -->|uses| CmdRepoP & EvtPubP & Order
    GetH -->|uses| QryRepoP
    ListH -->|uses| QryRepoP

    CmdRepoP -.->|implemented by| InMemCmd
    QryRepoP -.->|implemented by| InMemQry
    EvtPubP -.->|implemented by| InMemEvt
    IdGenP -.->|implemented by| UuidGen

    Order -->|produces| DomainEvent
    Order -->|throws| DomainError

    style Domain fill:#4a90d9,color:#fff
    style Application fill:#7ab648,color:#fff
    style Adapter fill:#e8943a,color:#fff
```

---

## 六角形架構的優勢

### 1. 可測試性

```mermaid
graph LR
    subgraph DomainTest["Domain 測試"]
        DT["直接 new Order()<br/>零依賴、零 Mock"]
    end

    subgraph AppTest["Application 測試"]
        AT["注入 InMemory 適配器<br/>不需 Mock 框架"]
    end

    subgraph IntTest["整合測試"]
        IT["DI Container 組裝<br/>端到端驗證"]
    end

    DomainTest --> AppTest --> IntTest

    style DomainTest fill:#4a90d9,color:#fff
    style AppTest fill:#7ab648,color:#fff
    style IntTest fill:#e8943a,color:#fff
```

```typescript
// Domain 測試：零依賴
const order = Order.create('id', 'customer');
order.addItem(new OrderItem('p1', '鍵盤', 2500, 1));
order.confirm();
expect(order.status).toBe(OrderStatus.CONFIRMED);
```

### 2. 技術可替換性

更換資料庫只需要新增一個 Adapter：

```typescript
// 從記憶體切換到 PostgreSQL - 只需要換掉 DI 容器中的實作
const commandRepo = new PostgresOrderRepository(connection);
// ↑ 應用層和領域層完全不需修改
```

### 3. 業務邏輯純粹

業務規則集中在 Domain 層，不會散落在各處：

```typescript
// Order.ts 中清晰地表達了所有業務規則
confirm(): void {
  if (this._status !== OrderStatus.DRAFT) { throw ... }  // 狀態驗證
  if (this._items.length === 0) { throw ... }             // 業務規則
  this._status = OrderStatus.CONFIRMED;                    // 狀態轉換
}
```

### 4. 漸進式開發

```mermaid
graph LR
    Phase1["Phase 1<br/>InMemory Repo<br/>快速原型"] --> Phase2["Phase 2<br/>PostgreSQL Repo<br/>正式環境"]
    Phase2 --> Phase3["Phase 3<br/>+ Redis Cache<br/>效能優化"]
    Phase3 --> Phase4["Phase 4<br/>+ Kafka Events<br/>微服務"]

    style Phase1 fill:#4a90d9,color:#fff
    style Phase2 fill:#7ab648,color:#fff
    style Phase3 fill:#e8943a,color:#fff
    style Phase4 fill:#9b59b6,color:#fff
```

---

## 六角形架構 vs 其他架構比較

### 與傳統三層式架構比較

```mermaid
graph TB
    subgraph Traditional["傳統三層式"]
        direction TB
        P["Presentation Layer"]
        B["Business Logic Layer"]
        D["Data Access Layer"]
        DB1["Database"]
        P --> B --> D --> DB1
    end

    subgraph Hexagonal["六角形架構"]
        direction TB
        DA["Driving Adapters"]
        IP["Input Ports"]
        APP["Application + Domain"]
        OP["Output Ports"]
        DRA["Driven Adapters"]
        DB2["Database"]
        DA --> IP
        IP --> APP
        APP --> OP
        OP -.-> DRA
        DRA --> DB2
    end

    style Traditional fill:#cc4444,color:#fff
    style Hexagonal fill:#7ab648,color:#fff
```

| 面向 | 傳統三層式 | 六角形架構 |
|------|----------|----------|
| **依賴方向** | Presentation → Business → Data | Adapters → Application → Domain |
| **DB 耦合** | Business 直接依賴 Data 層 | 透過 Output Port 抽象隔離 |
| **可測試性** | 需要 Mock DB 層 | Domain 零依賴可直接測試 |
| **技術替換** | 需要修改多層 | 只需新增/替換 Adapter |
| **複雜度** | 低 | 中 |
| **適合場景** | 小型 CRUD | 中大型有複雜業務邏輯的系統 |

### 與 Clean Architecture 比較

| 面向 | 六角形架構 | Clean Architecture |
|------|----------|-------------------|
| **提出者** | Alistair Cockburn (2005) | Robert C. Martin (2012) |
| **層數** | 3 層 (Domain, Application, Adapters) | 4 層 (Entities, Use Cases, Interface Adapters, Frameworks) |
| **核心概念** | Ports & Adapters | Dependency Rule |
| **介面位置** | Application 層定義 Port | Use Cases 層定義 Gateway |
| **相似度** | 高度相似，六角形更具體 | 更抽象，概念更廣泛 |

> 兩者的核心精神幾乎相同：**依賴由外向內，核心不依賴外部技術**。

---

## 優劣分析

| | 說明 |
|---|------|
| **優點** | |
| 可測試性極高 | Domain 零依賴可直接測試；InMemory 適配器讓整合測試也很簡單 |
| 技術可替換性 | DB、Message Queue、API 等都可透過新增 Adapter 替換 |
| 業務邏輯純粹 | Domain 層不受框架影響，業務規則集中清晰 |
| 並行開發 | 定義好 Port 介面後，各層可同時開發 |
| 漸進式演進 | 可先用簡單實作，逐步替換為正式的基礎設施 |
| **缺點** | |
| 前期成本高 | 需要定義大量介面和適配器 |
| 檔案數量多 | 本專案 23 個原始檔，傳統架構可能只需 5-6 個 |
| 學習門檻 | 團隊需要理解 Port/Adapter 概念 |
| 間接性增加 | Controller → Port → Handler → Domain → Port → Adapter |
| 簡單場景過度設計 | 純 CRUD 用六角形是殺雞用牛刀 |

### 適用場景判斷

```mermaid
graph TD
    Q1{"你的專案有<br/>複雜業務邏輯嗎？"}
    Q1 -->|否| A1["傳統三層式即可"]
    Q1 -->|是| Q2{"需要長期維護<br/>且可能換技術？"}
    Q2 -->|否| A2["三層式 + 介面隔離"]
    Q2 -->|是| A3["採用六角形架構"]

    style A1 fill:#888,color:#fff
    style A2 fill:#e8943a,color:#fff
    style A3 fill:#7ab648,color:#fff
```
