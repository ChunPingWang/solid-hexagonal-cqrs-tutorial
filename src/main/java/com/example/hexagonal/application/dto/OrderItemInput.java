package com.example.hexagonal.application.dto;

public record OrderItemInput(
        String productId,
        String productName,
        double unitPrice,
        int quantity
) {}
