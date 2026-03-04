package com.example.hexagonal.domain.event;

import java.time.Instant;
import java.util.UUID;

public record OrderConfirmedEvent(
        String eventId,
        Instant occurredOn,
        String aggregateId
) implements DomainEvent {

    public OrderConfirmedEvent(String aggregateId) {
        this(UUID.randomUUID().toString(), Instant.now(), aggregateId);
    }

    @Override
    public String eventType() {
        return "OrderConfirmed";
    }
}
