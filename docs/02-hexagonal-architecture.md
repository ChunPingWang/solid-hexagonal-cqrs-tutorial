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

```
                    ┌──────────────────────────┐
                    │    Driving Adapters       │
                    │   （驅動適配器 / 左側）     │
                    │                          │
                    │  ┌────────────────────┐   │
                    │  │ REST Controller    │   │
                    │  │ GraphQL Resolver   │   │
   使用者 ─────────→│  │ CLI Command        │   │
   外部系統          │  │ Message Consumer   │   │
                    │  └────────┬───────────┘   │
                    │           │               │
                    │     Input Ports           │
                    │    （輸入端口）             │
                    ├───────────┼───────────────┤
                    │           ▼               │
                    │  ┌────────────────────┐   │
                    │  │                    │   │
                    │  │   Application      │   │
                    │  │   Core             │   │
                    │  │   （應用核心）       │   │
                    │  │                    │   │
                    │  │   ┌────────────┐   │   │
                    │  │   │  Domain    │   │   │
                    │  │   │  Models    │   │   │
                    │  │   └────────────┘   │   │
                    │  │                    │   │
                    │  └────────┬───────────┘   │
                    │           │               │
                    │     Output Ports          │
                    │    （輸出端口）             │
                    ├───────────┼───────────────┤
                    │           ▼               │
                    │  ┌────────────────────┐   │
                    │  │ Database Repo      │   │
                    │  │ Message Queue      │   │
                    │  │ Email Service      │──────→ 資料庫
                    │  │ External API       │──────→ 外部服務
                    │  └────────────────────┘   │
                    │                          │
                    │    Driven Adapters        │
                    │   （被驅動適配器 / 右側）   │
                    └──────────────────────────┘
```

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
    └── messaging/
        └── InMemoryEventPublisher.ts
```

**特點：**
- 將外部技術轉換為內部可理解的形式
- 實作 Output Port 介面
- 呼叫 Input Port 介面
- 是唯一依賴具體技術的地方

---

## Ports 與 Adapters 的對應

### Input Ports（輸入端口）

| Port 介面 | 用途 | Adapter 實作 |
|-----------|------|-------------|
| `CreateOrderUseCase` | 建立訂單 | `OrderController.createOrder()` 呼叫 |
| `GetOrderUseCase` | 查詢訂單 | `OrderController.getOrder()` 呼叫 |
| `ConfirmOrderUseCase` | 確認訂單 | `OrderController.confirmOrder()` 呼叫 |
| `CancelOrderUseCase` | 取消訂單 | `OrderController.cancelOrder()` 呼叫 |

### Output Ports（輸出端口）

| Port 介面 | 用途 | Adapter 實作 |
|-----------|------|-------------|
| `OrderCommandRepository` | 儲存訂單（寫） | `InMemoryOrderCommandRepository` |
| `OrderQueryRepository` | 查詢訂單（讀） | `InMemoryOrderQueryRepository` |
| `EventPublisher` | 發布事件 | `InMemoryEventPublisher` |
| `IdGenerator` | 產生 ID | `UuidGenerator` / `FixedIdGenerator` |

---

## 依賴規則

```
外層可以依賴內層，內層不能依賴外層。

Adapters → Application → Domain
   ↓            ↓           ↓
 知道具體   知道介面    什麼都不知道
 技術細節   和領域     （純業務邏輯）
```

**依賴方向圖：**

```
OrderController
    │
    ↓ depends on
CreateOrderUseCase (interface)
    │
    ↑ implements
CreateOrderHandler
    │
    ↓ depends on
OrderCommandRepository (interface)
    │
    ↑ implements
InMemoryOrderCommandRepository
```

---

## 六角形架構的優勢

### 1. 可測試性

領域邏輯不依賴資料庫，可以直接用單元測試驗證：

```typescript
// 測試 Order 不需要任何 mock
const order = Order.create('id', 'customer');
order.addItem(new OrderItem('p1', '鍵盤', 2500, 1));
order.confirm();
expect(order.status).toBe(OrderStatus.CONFIRMED);
```

### 2. 技術無關性

更換資料庫只需要新增一個 Adapter：

```typescript
// 從記憶體切換到 PostgreSQL
// 只需要換掉 DI 容器中的實作
const commandRepo = new PostgresOrderRepository(connection);
// ↑ 應用層和領域層完全不需修改
```

### 3. 業務邏輯清晰

業務規則集中在 Domain 層，不會散落在各處：

```typescript
// Order.ts 中清晰地表達了所有業務規則
confirm(): void {
  if (this._status !== OrderStatus.DRAFT) { throw ... }
  if (this._items.length === 0) { throw ... }
  this._status = OrderStatus.CONFIRMED;
}
```

### 4. 漸進式開發

可以先用簡單的 InMemory 實作快速開發，
之後再替換為真正的資料庫：

```
第一階段：InMemoryOrderRepository   ← 快速原型
第二階段：PostgresOrderRepository    ← 正式環境
第三階段：MongoOrderRepository       ← 如果需要
```
