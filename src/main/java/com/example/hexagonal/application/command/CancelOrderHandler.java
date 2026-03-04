package com.example.hexagonal.application.command;

import com.example.hexagonal.application.dto.CancelOrderOutput;
import com.example.hexagonal.application.port.input.CancelOrderUseCase;
import com.example.hexagonal.application.port.output.EventPublisher;
import com.example.hexagonal.application.port.output.OrderCommandRepository;
import com.example.hexagonal.domain.exception.OrderNotFoundException;

import java.util.ArrayList;

public class CancelOrderHandler implements CancelOrderUseCase {

    private final OrderCommandRepository orderRepository;
    private final EventPublisher eventPublisher;

    public CancelOrderHandler(OrderCommandRepository orderRepository,
                              EventPublisher eventPublisher) {
        this.orderRepository = orderRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    public CancelOrderOutput execute(String orderId, String reason) {
        var order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        order.cancel(reason);

        orderRepository.save(order);
        eventPublisher.publishAll(new ArrayList<>(order.getDomainEvents()));
        order.clearEvents();

        return new CancelOrderOutput(
                order.getId(),
                order.getStatus().name(),
                reason);
    }
}
