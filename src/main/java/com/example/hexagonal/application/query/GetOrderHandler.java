package com.example.hexagonal.application.query;

// ============================================================
// Query Handler - CQRS 讀取端
// ============================================================
// 直接使用 QueryRepository（Read Model），不經過 Domain Model。
// 遵循 SRP：只負責查詢。遵循 DIP：依賴 OrderQueryRepository 介面。
// ============================================================

import com.example.hexagonal.application.dto.OrderView;
import com.example.hexagonal.application.port.input.GetOrderUseCase;
import com.example.hexagonal.application.port.output.OrderQueryRepository;
import com.example.hexagonal.domain.exception.OrderNotFoundException;

public class GetOrderHandler implements GetOrderUseCase {

    private final OrderQueryRepository queryRepository;

    public GetOrderHandler(OrderQueryRepository queryRepository) {
        this.queryRepository = queryRepository;
    }

    @Override
    public OrderView execute(String orderId) {
        var readModel = queryRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        return new OrderView(
                readModel.id(),
                readModel.customerId(),
                readModel.items(),
                readModel.totalAmount(),
                readModel.status(),
                readModel.createdAt());
    }
}
