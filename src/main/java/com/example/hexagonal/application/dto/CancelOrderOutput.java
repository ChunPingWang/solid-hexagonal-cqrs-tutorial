package com.example.hexagonal.application.dto;

public record CancelOrderOutput(
        String orderId,
        String status,
        String reason
) {}
