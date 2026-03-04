package com.example.hexagonal.application.dto;

public record ConfirmOrderOutput(
        String orderId,
        String status,
        double totalAmount
) {}
