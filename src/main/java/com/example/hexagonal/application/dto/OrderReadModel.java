package com.example.hexagonal.application.dto;

import java.util.List;

/**
 * CQRS 讀取模型 - 扁平化、非正規化的資料結構。
 * <p>
 * 與 Domain Model 不同，Read Model 沒有行為，
 * 所有欄位（如 totalAmount）都是預先計算好的。
 */
public record OrderReadModel(
        String id,
        String customerId,
        List<OrderItemView> items,
        double totalAmount,
        String status,
        String createdAt
) {}
