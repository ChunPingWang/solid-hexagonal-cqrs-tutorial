package com.example.hexagonal.domain.event;

import java.time.Instant;
import java.util.UUID;

public record OrderCreatedEvent(
        String eventId,
        Instant occurredOn,
        String aggregateId,
        String customerId,
        double totalAmount
) implements DomainEvent {

    public OrderCreatedEvent(String aggregateId, String customerId, double totalAmount) {
        this(UUID.randomUUID().toString(), Instant.now(), aggregateId, customerId, totalAmount);
    }

    @Override
    public String eventType() {
        return "OrderCreated";
    }
}
