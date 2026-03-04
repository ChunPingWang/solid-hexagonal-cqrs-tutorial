package com.example.hexagonal.adapter.input.rest.dto;

import com.example.hexagonal.application.dto.OrderItemInput;

import java.util.List;

public record CreateOrderRequest(
        String customerId,
        List<OrderItemInput> items
) {}
