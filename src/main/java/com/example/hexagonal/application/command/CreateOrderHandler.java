package com.example.hexagonal.application.command;

// ============================================================
// Command Handler - 建立訂單
// ============================================================
// CQRS 寫入端。遵循 SRP：只負責「建立訂單」。
// 遵循 DIP：依賴抽象介面（Repository, EventPublisher, IdGenerator）。
// 注意：此類別不使用任何 Spring 注解，由 BeanConfiguration 進行 DI。
// ============================================================

import com.example.hexagonal.application.dto.CreateOrderInput;
import com.example.hexagonal.application.dto.CreateOrderOutput;
import com.example.hexagonal.application.port.input.CreateOrderUseCase;
import com.example.hexagonal.application.port.output.EventPublisher;
import com.example.hexagonal.application.port.output.IdGenerator;
import com.example.hexagonal.application.port.output.OrderCommandRepository;
import com.example.hexagonal.domain.model.Order;
import com.example.hexagonal.domain.model.OrderItem;

import java.util.ArrayList;

public class CreateOrderHandler implements CreateOrderUseCase {

    private final OrderCommandRepository orderRepository;
    private final EventPublisher eventPublisher;
    private final IdGenerator idGenerator;

    public CreateOrderHandler(OrderCommandRepository orderRepository,
                              EventPublisher eventPublisher,
                              IdGenerator idGenerator) {
        this.orderRepository = orderRepository;
        this.eventPublisher = eventPublisher;
        this.idGenerator = idGenerator;
    }

    @Override
    public CreateOrderOutput execute(CreateOrderInput input) {
        // 1. 產生訂單 ID
        var orderId = idGenerator.generate();

        // 2. 建立訂單聚合根
        var order = Order.create(orderId, input.customerId());

        // 3. 新增訂單項目
        for (var item : input.items()) {
            order.addItem(new OrderItem(
                    item.productId(), item.productName(),
                    item.unitPrice(), item.quantity()));
        }

        // 4. 持久化訂單
        orderRepository.save(order);

        // 5. 發布領域事件
        eventPublisher.publishAll(new ArrayList<>(order.getDomainEvents()));
        order.clearEvents();

        // 6. 回傳結果
        return new CreateOrderOutput(
                order.getId(),
                order.getTotalAmount(),
                order.getStatus().name(),
                order.getItems().size());
    }
}
