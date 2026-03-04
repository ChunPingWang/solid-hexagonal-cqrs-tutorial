package com.example.hexagonal.application.port.input;

import com.example.hexagonal.application.dto.CancelOrderOutput;

public interface CancelOrderUseCase {
    CancelOrderOutput execute(String orderId, String reason);
}
