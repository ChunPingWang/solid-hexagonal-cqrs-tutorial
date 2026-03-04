# 六角形架構 + CQRS + SOLID 原則 教學專案

> 透過一個**訂單管理系統**，學習如何結合六角形架構、CQRS 模式與 SOLID 原則來設計乾淨的軟體架構。

---

## 目錄

- [快速開始](#快速開始)
- [專案結構](#專案結構)
- [架構概覽](#架構概覽)
- [SOLID 原則對照表](#solid-原則對照表)
- [教學文件](#教學文件)
- [測試](#測試)

---

## 快速開始

```bash
# 安裝依賴
npm install

# 執行測試（46 個測試案例）
npm test

# 執行範例程式
npm start

# 編譯 TypeScript
npm run build
```

---

## 專案結構

```
solid-hexagonal-cqrs-tutorial/
│
├── src/
│   ├── domain/                          # 🔵 領域層（最內層）
│   │   ├── models/
│   │   │   ├── Order.ts                 #    訂單聚合根
│   │   │   ├── OrderItem.ts             #    訂單項目值物件
│   │   │   └── Product.ts               #    產品值物件
│   │   ├── events/
│   │   │   └── DomainEvent.ts           #    領域事件定義
│   │   └── errors/
│   │       └── DomainError.ts           #    領域錯誤定義
│   │
│   ├── application/                     # 🟢 應用層（中間層）
│   │   ├── ports/
│   │   │   ├── input/                   #    Input Ports（驅動端介面）
│   │   │   │   ├── CreateOrderUseCase.ts
│   │   │   │   ├── GetOrderUseCase.ts
│   │   │   │   ├── ConfirmOrderUseCase.ts
│   │   │   │   └── CancelOrderUseCase.ts
│   │   │   └── output/                  #    Output Ports（被驅動端介面）
│   │   │       ├── OrderRepository.ts   #    讀寫分離的儲存庫介面
│   │   │       ├── EventPublisher.ts
│   │   │       └── IdGenerator.ts
│   │   ├── commands/                    #    CQRS 命令端
│   │   │   ├── CreateOrderHandler.ts
│   │   │   ├── ConfirmOrderHandler.ts
│   │   │   └── CancelOrderHandler.ts
│   │   └── queries/                     #    CQRS 查詢端
│   │       └── GetOrderHandler.ts
│   │
│   ├── adapters/                        # 🟠 適配器層（最外層）
│   │   ├── input/                       #    Driving Adapters（驅動適配器）
│   │   │   └── api/
│   │   │       └── OrderController.ts
│   │   └── output/                      #    Driven Adapters（被驅動適配器）
│   │       ├── persistence/
│   │       │   ├── InMemoryOrderCommandRepository.ts
│   │       │   └── InMemoryOrderQueryRepository.ts
│   │       ├── messaging/
│   │       │   └── InMemoryEventPublisher.ts
│   │       └── IdGeneratorAdapter.ts
│   │
│   ├── infrastructure/                  # ⚙️ 基礎設施
│   │   └── DependencyInjection.ts       #    DI 容器（組裝所有元件）
│   │
│   └── index.ts                         #    入口程式
│
├── tests/                               # 🧪 測試
│   ├── domain/
│   │   └── Order.test.ts                #    領域模型單元測試
│   ├── application/
│   │   ├── CreateOrderHandler.test.ts   #    命令處理器測試
│   │   ├── ConfirmAndCancelHandler.test.ts
│   │   └── GetOrderHandler.test.ts      #    查詢處理器測試
│   └── adapters/
│       └── OrderController.test.ts      #    整合測試
│
└── docs/                                # 📖 教學文件
    ├── 01-solid-principles.md
    ├── 02-hexagonal-architecture.md
    └── 03-cqrs-pattern.md
```

---

## 架構概覽

```
                外部世界（使用者、API）
                       │
            ┌──────────┼──────────┐
            │    Input Adapters    │
            │   OrderController    │
            └──────────┬──────────┘
                       │ 呼叫
            ╔══════════╧══════════╗
            ║    Input Ports       ║
            ║  (Use Case 介面)     ║
            ╠═════════════════════╣
            ║                     ║
            ║   Command Handlers  ║──── CQRS 寫入端
            ║   Query Handlers    ║──── CQRS 讀取端
            ║                     ║
            ║  ┌───────────────┐  ║
            ║  │  Domain Layer │  ║ ← 核心業務邏輯
            ║  │  Order, Item  │  ║    零外部依賴
            ║  └───────────────┘  ║
            ║                     ║
            ╠═════════════════════╣
            ║   Output Ports       ║
            ║  (Repository 介面)   ║
            ╚══════════╤══════════╝
                       │ 實作
            ┌──────────┼──────────┐
            │   Output Adapters    │
            │  InMemoryRepository  │
            │  InMemoryEventPub    │
            └──────────┬──────────┘
                       │
                外部世界（資料庫、訊息佇列）
```

### 依賴方向

```
所有依賴都指向內層：

Adapters ──→ Application ──→ Domain
(外層)        (中間層)        (內層)
```

---

## SOLID 原則對照表

| 原則 | 說明 | 在本專案中的位置 |
|------|------|----------------|
| **S**RP | 單一職責 | 每個 Handler 只處理一個操作；每個 Model 只封裝一個概念 |
| **O**CP | 開放封閉 | 新增事件類型不需修改 EventPublisher；新增查詢不需修改命令端 |
| **L**SP | 里氏替換 | `InMemoryRepo` 可被 `PostgresRepo` 無縫替換 |
| **I**SP | 介面隔離 | `CommandRepository` 與 `QueryRepository` 分離；每個 UseCase 是獨立介面 |
| **D**IP | 依賴反轉 | Handler 依賴 Port 介面，不依賴具體 Adapter |

### SOLID 在各層的體現

```
Domain Layer:
  └─ SRP: Order 只管業務邏輯，OrderItem 只管項目計算
  └─ OCP: DomainEvent 介面可擴展新事件類型

Application Layer:
  └─ SRP: 每個 Handler 只處理一個用例
  └─ ISP: Input/Output Port 各自獨立
  └─ DIP: Handler 只依賴 Port 介面

Adapter Layer:
  └─ LSP: 任何 Repository 實作可互相替換
  └─ DIP: 實作由 DI Container 注入

Infrastructure:
  └─ DIP: DI Container 是唯一知道所有具體類別的地方
```

---

## 教學文件

詳細的概念說明與程式碼解析，請參考 `docs/` 目錄：

1. **[SOLID 原則](docs/01-solid-principles.md)** - 五大原則詳細說明與本專案對照
2. **[六角形架構](docs/02-hexagonal-architecture.md)** - Ports & Adapters 架構詳解
3. **[CQRS 模式](docs/03-cqrs-pattern.md)** - 命令查詢職責分離模式

---

## 測試

```bash
# 執行所有測試
npm test

# 執行測試並顯示覆蓋率
npm run test:coverage
```

### 測試結構

| 測試檔案 | 測試目標 | 測試數量 |
|---------|---------|---------|
| `Order.test.ts` | 領域模型（純業務邏輯） | 25 |
| `CreateOrderHandler.test.ts` | 建立訂單命令處理 | 5 |
| `ConfirmAndCancelHandler.test.ts` | 確認/取消訂單命令處理 | 5 |
| `GetOrderHandler.test.ts` | CQRS 查詢端 | 4 |
| `OrderController.test.ts` | 端到端整合測試 | 7 |
| **總計** | | **46** |

### 為什麼測試這麼容易寫？

六角形架構讓測試變得極為簡單：

- **Domain 測試**：零依賴，直接 new 出來就能測
- **Application 測試**：用 InMemory 適配器替換外部依賴
- **整合測試**：用 DI Container 組裝全部元件，端到端驗證

---

## 延伸思考

### 如何擴展此架構？

1. **新增 REST API**：建立 Express/Fastify 的 Driving Adapter
2. **換成真實資料庫**：實作 PostgresOrderRepository
3. **加入訊息佇列**：實作 KafkaEventPublisher
4. **Event Sourcing**：將 Command Store 改為 Event Store
5. **微服務拆分**：Command 和 Query 可以部署為獨立服務

### 延伸閱讀

- Alistair Cockburn - Hexagonal Architecture
- Robert C. Martin - Clean Architecture
- Greg Young - CQRS and Event Sourcing
- Vaughn Vernon - Implementing Domain-Driven Design
