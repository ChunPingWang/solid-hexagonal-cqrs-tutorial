// ============================================================
// OrderItem Value Object - 訂單項目值物件
// ============================================================
// 不可變的值物件，封裝了訂單中每個商品的資訊。
// 遵循 SRP：只負責表達「訂單中的一項商品」這個概念。
// ============================================================

import { InvalidOrderItemError } from '../errors/DomainError';

export class OrderItem {
  readonly subtotal: number;

  constructor(
    readonly productId: string,
    readonly productName: string,
    readonly unitPrice: number,
    readonly quantity: number,
  ) {
    if (!productId || productId.trim() === '') {
      throw new InvalidOrderItemError('產品 ID 不能為空');
    }
    if (quantity <= 0) {
      throw new InvalidOrderItemError('數量必須大於 0');
    }
    if (unitPrice < 0) {
      throw new InvalidOrderItemError('單價不能為負數');
    }
    this.subtotal = unitPrice * quantity;
  }
}
