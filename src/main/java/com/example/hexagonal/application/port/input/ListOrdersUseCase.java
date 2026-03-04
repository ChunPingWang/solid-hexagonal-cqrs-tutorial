package com.example.hexagonal.application.port.input;

import com.example.hexagonal.application.dto.OrderView;

import java.util.List;

public interface ListOrdersUseCase {
    List<OrderView> execute(String customerId);
}
