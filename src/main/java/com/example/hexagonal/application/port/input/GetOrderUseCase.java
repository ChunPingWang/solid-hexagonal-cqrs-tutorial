package com.example.hexagonal.application.port.input;

import com.example.hexagonal.application.dto.OrderView;

/**
 * Input Port - 查詢訂單用例（CQRS Query 端）。
 */
public interface GetOrderUseCase {
    OrderView execute(String orderId);
}
