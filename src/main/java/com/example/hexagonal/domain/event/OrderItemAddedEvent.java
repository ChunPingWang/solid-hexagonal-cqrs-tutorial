package com.example.hexagonal.domain.event;

import java.time.Instant;
import java.util.UUID;

public record OrderItemAddedEvent(
        String eventId,
        Instant occurredOn,
        String aggregateId,
        String productId,
        int quantity
) implements DomainEvent {

    public OrderItemAddedEvent(String aggregateId, String productId, int quantity) {
        this(UUID.randomUUID().toString(), Instant.now(), aggregateId, productId, quantity);
    }

    @Override
    public String eventType() {
        return "OrderItemAdded";
    }
}
