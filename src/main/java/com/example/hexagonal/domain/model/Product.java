package com.example.hexagonal.domain.model;

// ============================================================
// Product Value Object - 產品值物件
// ============================================================
// 使用 Java 21 Record：天生不可變、自動生成 equals/hashCode/toString。
// 遵循 SRP：只負責表達「產品」概念。
// ============================================================

import com.example.hexagonal.domain.exception.DomainException;

public record Product(String id, String name, double price) {

    public Product {
        if (id == null || id.isBlank()) {
            throw new DomainException("產品 ID 不能為空");
        }
        if (name == null || name.isBlank()) {
            throw new DomainException("產品名稱不能為空");
        }
        if (price < 0) {
            throw new DomainException("產品價格不能為負數");
        }
    }
}
