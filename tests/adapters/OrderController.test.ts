// ============================================================
// Driving Adapter 測試 - 訂單控制器
// ============================================================
// 整合測試：驗證從 Controller 到 Domain 的完整流程。
// 使用 DI Container 組裝所有元件。
// ============================================================

import { createContainer } from '../../src/infrastructure/DependencyInjection';
import { OrderController } from '../../src/adapters/input/api/OrderController';

describe('OrderController（整合測試）', () => {
  let controller: OrderController;

  beforeEach(() => {
    const container = createContainer();
    controller = container.orderController;
  });

  describe('createOrder', () => {
    it('應該成功建立訂單並回傳成功回應', async () => {
      const response = await controller.createOrder({
        customerId: 'c1',
        items: [
          { productId: 'p1', productName: '鍵盤', unitPrice: 2500, quantity: 1 },
        ],
      });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.orderId).toBeDefined();
      expect(response.data.totalAmount).toBe(2500);
    });

    it('無效輸入應該回傳錯誤回應', async () => {
      const response = await controller.createOrder({
        customerId: 'c1',
        items: [
          { productId: '', productName: '鍵盤', unitPrice: 2500, quantity: 1 },
        ],
      });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('完整訂單生命週期', () => {
    it('建立 → 查詢 → 確認 → 取消', async () => {
      // 1. 建立
      const createRes = await controller.createOrder({
        customerId: 'c1',
        items: [
          { productId: 'p1', productName: '鍵盤', unitPrice: 2500, quantity: 1 },
          { productId: 'p2', productName: '滑鼠', unitPrice: 800, quantity: 2 },
        ],
      });
      expect(createRes.success).toBe(true);
      const orderId = createRes.data.orderId;

      // 2. 查詢（CQRS 讀取端）
      const getRes = await controller.getOrder(orderId);
      expect(getRes.success).toBe(true);
      expect(getRes.data.totalAmount).toBe(4100);
      expect(getRes.data.items).toHaveLength(2);

      // 3. 確認
      const confirmRes = await controller.confirmOrder(orderId);
      expect(confirmRes.success).toBe(true);
      expect(confirmRes.data.status).toBe('CONFIRMED');

      // 4. 取消
      const cancelRes = await controller.cancelOrder(orderId, '客戶要求取消');
      expect(cancelRes.success).toBe(true);
      expect(cancelRes.data.status).toBe('CANCELLED');

      // 5. 驗證最終狀態
      const finalRes = await controller.getOrder(orderId);
      expect(finalRes.success).toBe(true);
      expect(finalRes.data.status).toBe('CANCELLED');
    });
  });

  describe('listOrders', () => {
    it('應該列出所有訂單', async () => {
      await controller.createOrder({
        customerId: 'c1',
        items: [{ productId: 'p1', productName: '鍵盤', unitPrice: 2500, quantity: 1 }],
      });
      await controller.createOrder({
        customerId: 'c2',
        items: [{ productId: 'p2', productName: '滑鼠', unitPrice: 800, quantity: 1 }],
      });

      const listRes = await controller.listOrders();
      expect(listRes.success).toBe(true);
      expect(listRes.data).toHaveLength(2);
    });

    it('應該能依客戶篩選', async () => {
      await controller.createOrder({
        customerId: 'c1',
        items: [{ productId: 'p1', productName: '鍵盤', unitPrice: 2500, quantity: 1 }],
      });
      await controller.createOrder({
        customerId: 'c2',
        items: [{ productId: 'p2', productName: '滑鼠', unitPrice: 800, quantity: 1 }],
      });

      const listRes = await controller.listOrders('c1');
      expect(listRes.success).toBe(true);
      expect(listRes.data).toHaveLength(1);
      expect(listRes.data[0].customerId).toBe('c1');
    });
  });

  describe('錯誤處理', () => {
    it('查詢不存在的訂單應該回傳錯誤', async () => {
      const res = await controller.getOrder('non-existent');
      expect(res.success).toBe(false);
      expect(res.error).toContain('找不到訂單');
    });

    it('確認不存在的訂單應該回傳錯誤', async () => {
      const res = await controller.confirmOrder('non-existent');
      expect(res.success).toBe(false);
    });
  });
});
