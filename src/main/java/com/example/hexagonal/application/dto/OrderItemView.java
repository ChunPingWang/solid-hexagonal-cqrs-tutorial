package com.example.hexagonal.application.dto;

public record OrderItemView(
        String productId,
        String productName,
        double unitPrice,
        int quantity,
        double subtotal
) {}
