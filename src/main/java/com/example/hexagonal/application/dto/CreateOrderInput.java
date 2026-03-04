package com.example.hexagonal.application.dto;

import java.util.List;

public record CreateOrderInput(
        String customerId,
        List<OrderItemInput> items
) {}
