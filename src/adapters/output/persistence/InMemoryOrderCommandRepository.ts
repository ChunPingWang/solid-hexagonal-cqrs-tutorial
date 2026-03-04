// ============================================================
// Driven Adapter - 記憶體版訂單命令儲存庫
// ============================================================
// 這是 Output Port (OrderCommandRepository) 的具體實作。
// 在六角形架構中，這屬於「被驅動的適配器」(Driven Adapter)。
//
// 遵循 LSP（里氏替換原則）：
//   此實作可以被任何其他 OrderCommandRepository 的實作替換，
//   例如 PostgresOrderRepository、MongoOrderRepository 等，
//   而不會影響應用層的行為。
//
// 遵循 DIP：實作由外部注入，核心程式碼不知道此類別的存在。
// ============================================================

import { Order, OrderStatus } from '../../../domain/models/Order';
import { OrderItem } from '../../../domain/models/OrderItem';
import { OrderCommandRepository } from '../../../application/ports/output/OrderRepository';

interface StoredOrder {
  id: string;
  customerId: string;
  items: Array<{
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
  }>;
  status: OrderStatus;
  createdAt: string;
}

export class InMemoryOrderCommandRepository implements OrderCommandRepository {
  private store = new Map<string, StoredOrder>();

  async save(order: Order): Promise<void> {
    this.store.set(order.id, {
      id: order.id,
      customerId: order.customerId,
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      })),
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    });
  }

  async findById(id: string): Promise<Order | null> {
    const stored = this.store.get(id);
    if (!stored) return null;

    const items = stored.items.map(
      (i) => new OrderItem(i.productId, i.productName, i.unitPrice, i.quantity),
    );

    return Order.reconstruct(
      stored.id,
      stored.customerId,
      items,
      stored.status,
      new Date(stored.createdAt),
    );
  }

  // 測試輔助方法
  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
