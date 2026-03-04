// ============================================================
// Product Value Object - 產品值物件
// ============================================================
// Value Object（值物件）是不可變的，透過其屬性值來識別。
// 遵循 SRP（單一職責原則）：只負責表達產品的概念。
// ============================================================

export class Product {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly price: number,
  ) {
    if (!id || id.trim() === '') {
      throw new Error('產品 ID 不能為空');
    }
    if (!name || name.trim() === '') {
      throw new Error('產品名稱不能為空');
    }
    if (price < 0) {
      throw new Error('產品價格不能為負數');
    }
  }
}
