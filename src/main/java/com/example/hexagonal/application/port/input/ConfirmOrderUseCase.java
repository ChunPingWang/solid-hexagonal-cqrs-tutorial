package com.example.hexagonal.application.port.input;

import com.example.hexagonal.application.dto.ConfirmOrderOutput;

public interface ConfirmOrderUseCase {
    ConfirmOrderOutput execute(String orderId);
}
