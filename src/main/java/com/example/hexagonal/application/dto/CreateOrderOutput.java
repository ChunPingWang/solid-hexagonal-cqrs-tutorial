package com.example.hexagonal.application.dto;

public record CreateOrderOutput(
        String orderId,
        double totalAmount,
        String status,
        int itemCount
) {}
