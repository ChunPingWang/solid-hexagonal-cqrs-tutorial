// ============================================================
// 應用程式入口 - 展示整合使用方式
// ============================================================

import { createContainer } from './infrastructure/DependencyInjection';

async function main() {
  console.log('=== 六角形架構 + CQRS 教學範例 ===\n');

  // 建立 DI 容器
  const { orderController } = createContainer();

  // 1. 建立訂單
  console.log('📦 建立訂單...');
  const createResult = await orderController.createOrder({
    customerId: 'customer-001',
    items: [
      { productId: 'prod-1', productName: '鍵盤', unitPrice: 2500, quantity: 1 },
      { productId: 'prod-2', productName: '滑鼠', unitPrice: 800, quantity: 2 },
    ],
  });
  console.log('建立結果:', JSON.stringify(createResult, null, 2));

  if (!createResult.success || !createResult.data) {
    console.error('建立訂單失敗');
    return;
  }

  const orderId = createResult.data.orderId;

  // 2. 查詢訂單（CQRS 查詢端）
  console.log('\n🔍 查詢訂單...');
  const getResult = await orderController.getOrder(orderId);
  console.log('查詢結果:', JSON.stringify(getResult, null, 2));

  // 3. 確認訂單
  console.log('\n✅ 確認訂單...');
  const confirmResult = await orderController.confirmOrder(orderId);
  console.log('確認結果:', JSON.stringify(confirmResult, null, 2));

  // 4. 列出所有訂單
  console.log('\n📋 列出所有訂單...');
  const listResult = await orderController.listOrders();
  console.log('列表結果:', JSON.stringify(listResult, null, 2));

  // 5. 取消訂單
  console.log('\n❌ 取消訂單...');
  const cancelResult = await orderController.cancelOrder(orderId, '客戶要求取消');
  console.log('取消結果:', JSON.stringify(cancelResult, null, 2));

  console.log('\n=== 範例結束 ===');
}

main().catch(console.error);
