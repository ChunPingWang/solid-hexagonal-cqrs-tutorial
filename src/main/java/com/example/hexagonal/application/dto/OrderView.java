package com.example.hexagonal.application.dto;

import java.util.List;

public record OrderView(
        String id,
        String customerId,
        List<OrderItemView> items,
        double totalAmount,
        String status,
        String createdAt
) {}
