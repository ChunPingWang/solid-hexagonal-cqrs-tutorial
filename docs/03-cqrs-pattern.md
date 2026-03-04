# CQRS 模式 (Command Query Responsibility Segregation)

## 命令查詢職責分離

由 Greg Young 基於 Bertrand Meyer 的 CQS 原則所提出。

---

## 核心思想

> **將「改變狀態的操作」和「讀取狀態的操作」分離到不同的模型中。**

```
傳統架構：                    CQRS 架構：

┌──────────┐                ┌──────────────┐
│          │                │  Command     │
│  統一的   │                │  Model       │──→ Write DB
│  Model   │──→ 同一個 DB   │  (寫入模型)   │
│          │                └──────────────┘
└──────────┘
                            ┌──────────────┐
                            │  Query       │
                            │  Model       │──→ Read DB
                            │  (讀取模型)   │
                            └──────────────┘
```

---

## 為什麼需要 CQRS？

### 問題：讀寫需求的矛盾

| 面向 | 寫入端 | 讀取端 |
|------|--------|--------|
| 資料模型 | 正規化（避免冗餘） | 非正規化（避免 JOIN） |
| 效能優化 | 事務一致性 | 查詢速度 |
| 擴展方式 | 垂直擴展 | 水平擴展（讀取通常遠多於寫入） |
| 驗證需求 | 嚴格的業務規則 | 幾乎不需要 |

---

## 本專案中的 CQRS 實作

### Command Side（命令端 / 寫入端）

```
使用者操作 → Controller → Command Handler → Domain Model → Command Repository
                                                              │
                                                              ↓
                                                         Write Store
                                                              │
                                                    Domain Events 發布
                                                              │
                                                              ↓
                                                    同步 Read Model
```

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
// CreateOrderHandler.ts
async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
  const order = Order.create(orderId, input.customerId);  // ← Domain Model
  for (const item of input.items) {
    order.addItem(new OrderItem(...));  // ← 業務邏輯在 Domain 中
  }
  await this.orderRepository.save(order);       // ← 寫入 Command Store
  await this.eventPublisher.publishAll([...]);   // ← 發布事件
}
```

### Query Side（查詢端 / 讀取端）

```
使用者查詢 → Controller → Query Handler → Query Repository → Read Store
                                                                │
                                                                ↓
                                                          Read Model
                                                       (扁平化的資料)
```

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
// Read Model - 扁平化、非正規化，可以直接回傳給前端
interface OrderReadModel {
  id: string;
  customerId: string;
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;    // ← 預先計算好，不需要再次計算
  }>;
  totalAmount: number;   // ← 預先計算好
  status: string;
  createdAt: string;
}
```

---

## 讀寫模型的同步

本專案使用**事件驅動的同步機制**：

```
Command 執行完畢
       │
       ↓
  發布 Domain Events
       │
       ↓
  Event Publisher 收到事件
       │
       ↓
  從 Command Repository 讀取最新狀態
       │
       ↓
  轉換為 Read Model
       │
       ↓
  同步到 Query Repository
```

**程式碼（InMemoryEventPublisher.ts）：**

```typescript
async publish(event: DomainEvent): Promise<void> {
  this.publishedEvents.push(event);
  await this.syncReadModel(event.aggregateId);  // ← 同步讀取模型
}

private async syncReadModel(orderId: string): Promise<void> {
  const order = await this.commandRepo.findById(orderId);
  const readModel: OrderReadModel = {
    // 將 Domain Model 轉換為扁平化的 Read Model
    id: order.id,
    totalAmount: order.totalAmount,  // ← 預先計算
    // ...
  };
  this.queryRepo.sync(readModel);
}
```

---

## CQRS 的三種層級

### Level 1：同一資料庫，不同模型（本專案）

```
┌─────────────┐     ┌─────────────┐
│ Command      │     │ Query       │
│ Handler      │     │ Handler     │
└──────┬───────┘     └──────┬──────┘
       │                    │
       ↓                    ↓
┌─────────────┐     ┌─────────────┐
│ Command     │     │ Query       │
│ Repository  │────→│ Repository  │
│ (Write)     │ 同步 │ (Read)      │
└─────────────┘     └─────────────┘
       │                    │
       └────────┬───────────┘
                ↓
        ┌─────────────┐
        │  同一個      │
        │  資料庫      │
        └─────────────┘
```

### Level 2：不同資料庫（進階）

```
Command Repository ──→ PostgreSQL（寫入優化）
                           │
                      Event Bus（異步）
                           │
Query Repository  ←── Elasticsearch（讀取優化）
```

### Level 3：Event Sourcing + CQRS（最進階）

```
Command Side ──→ Event Store（只儲存事件）
                      │
                 Event Projection
                      │
Query Side   ←── Materialized View（物化視圖）
```

---

## CQRS 與 SOLID 原則的關係

| SOLID 原則 | CQRS 中的體現 |
|-----------|--------------|
| **SRP** | Command Handler 和 Query Handler 各自只負責一個操作 |
| **OCP** | 新增查詢方式時，不需要修改現有的命令處理器 |
| **LSP** | CommandRepository 和 QueryRepository 的實作可以隨意替換 |
| **ISP** | 讀寫分離成不同的介面（CommandRepo vs QueryRepo） |
| **DIP** | Handler 依賴 Repository 介面，不依賴具體實作 |

---

## CQRS 的適用場景

### 適合使用 CQRS

- 讀寫比例懸殊（讀取 >> 寫入）
- 讀寫需要不同的資料模型
- 需要獨立擴展讀取和寫入
- 複雜的業務邏輯（Command Side）
- 多樣的查詢需求（Query Side）

### 不適合使用 CQRS

- 簡單的 CRUD 應用
- 讀寫模型幾乎相同
- 強一致性需求（CQRS 天然適合最終一致性）
- 團隊對此模式不熟悉（增加複雜度）

---

## 完整資料流範例

以「建立訂單」為例：

```
1. Controller 收到 HTTP POST /orders 請求
   │
   ↓
2. 呼叫 CreateOrderUseCase.execute(input)
   │
   ↓
3. CreateOrderHandler:
   a. 用 IdGenerator 產生 ID
   b. 用 Order.create() 建立聚合根
   c. 用 order.addItem() 新增項目（業務驗證）
   d. 呼叫 OrderCommandRepository.save(order)    ← 寫入
   e. 呼叫 EventPublisher.publishAll(events)     ← 發布事件
   │
   ↓
4. EventPublisher:
   a. 收到 OrderCreated + OrderItemAdded 事件
   b. 從 CommandRepo 讀取最新的 Order
   c. 轉換為 OrderReadModel
   d. 同步到 OrderQueryRepository               ← 更新讀取模型
   │
   ↓
5. Controller 回傳成功回應給使用者

--- 之後查詢時 ---

6. Controller 收到 HTTP GET /orders/:id 請求
   │
   ↓
7. 呼叫 GetOrderUseCase.execute(orderId)
   │
   ↓
8. GetOrderHandler:
   a. 從 OrderQueryRepository 查詢              ← 直接讀取
   b. 回傳 OrderView（不需要經過 Domain Model）
```
