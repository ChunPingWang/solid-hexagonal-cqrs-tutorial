package com.example.hexagonal.domain.event;

import java.time.Instant;
import java.util.UUID;

public record OrderCancelledEvent(
        String eventId,
        Instant occurredOn,
        String aggregateId,
        String reason
) implements DomainEvent {

    public OrderCancelledEvent(String aggregateId, String reason) {
        this(UUID.randomUUID().toString(), Instant.now(), aggregateId, reason);
    }

    @Override
    public String eventType() {
        return "OrderCancelled";
    }
}
