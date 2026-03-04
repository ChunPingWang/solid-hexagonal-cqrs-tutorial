package com.example.hexagonal.domain.model;

// ============================================================
// OrderItem Value Object - 訂單項目值物件
// ============================================================
// 使用 Java 21 Record，不可變。
// 遵循 SRP：只負責表達「訂單中的一項商品」概念。
// ============================================================

import com.example.hexagonal.domain.exception.InvalidOrderItemException;

public record OrderItem(
        String productId,
        String productName,
        double unitPrice,
        int quantity
) {
    public OrderItem {
        if (productId == null || productId.isBlank()) {
            throw new InvalidOrderItemException("產品 ID 不能為空");
        }
        if (quantity <= 0) {
            throw new InvalidOrderItemException("數量必須大於 0");
        }
        if (unitPrice < 0) {
            throw new InvalidOrderItemException("單價不能為負數");
        }
    }

    public double subtotal() {
        return unitPrice * quantity;
    }
}
