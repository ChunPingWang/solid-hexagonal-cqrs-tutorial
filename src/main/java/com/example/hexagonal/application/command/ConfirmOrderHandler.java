package com.example.hexagonal.application.command;

import com.example.hexagonal.application.dto.ConfirmOrderOutput;
import com.example.hexagonal.application.port.input.ConfirmOrderUseCase;
import com.example.hexagonal.application.port.output.EventPublisher;
import com.example.hexagonal.application.port.output.OrderCommandRepository;
import com.example.hexagonal.domain.exception.OrderNotFoundException;

import java.util.ArrayList;

public class ConfirmOrderHandler implements ConfirmOrderUseCase {

    private final OrderCommandRepository orderRepository;
    private final EventPublisher eventPublisher;

    public ConfirmOrderHandler(OrderCommandRepository orderRepository,
                               EventPublisher eventPublisher) {
        this.orderRepository = orderRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    public ConfirmOrderOutput execute(String orderId) {
        var order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        order.confirm();

        orderRepository.save(order);
        eventPublisher.publishAll(new ArrayList<>(order.getDomainEvents()));
        order.clearEvents();

        return new ConfirmOrderOutput(
                order.getId(),
                order.getStatus().name(),
                order.getTotalAmount());
    }
}
