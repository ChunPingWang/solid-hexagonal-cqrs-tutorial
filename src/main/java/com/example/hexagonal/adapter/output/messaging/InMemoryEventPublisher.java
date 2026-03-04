package com.example.hexagonal.adapter.output.messaging;

// ============================================================
// Driven Adapter - 記憶體版事件發布者
// ============================================================
// 負責發布事件並同步讀取模型（CQRS 讀寫同步）。
// 在真實場景中，可替換為 Kafka / RabbitMQ 實作。
// ============================================================

import com.example.hexagonal.adapter.output.persistence.InMemoryOrderCommandRepository;
import com.example.hexagonal.adapter.output.persistence.InMemoryOrderQueryRepository;
import com.example.hexagonal.application.dto.OrderItemView;
import com.example.hexagonal.application.dto.OrderReadModel;
import com.example.hexagonal.application.port.output.EventPublisher;
import com.example.hexagonal.domain.event.DomainEvent;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class InMemoryEventPublisher implements EventPublisher {

    private final List<DomainEvent> publishedEvents = new ArrayList<>();
    private final InMemoryOrderCommandRepository commandRepo;
    private final InMemoryOrderQueryRepository queryRepo;

    public InMemoryEventPublisher(InMemoryOrderCommandRepository commandRepo,
                                  InMemoryOrderQueryRepository queryRepo) {
        this.commandRepo = commandRepo;
        this.queryRepo = queryRepo;
    }

    @Override
    public void publish(DomainEvent event) {
        publishedEvents.add(event);
        syncReadModel(event.aggregateId());
    }

    @Override
    public void publishAll(List<DomainEvent> events) {
        events.forEach(this::publish);
    }

    /**
     * 同步讀取模型：Command 端 → Read Model。
     * 在真實系統中這會是獨立的 Projector / Event Handler。
     */
    private void syncReadModel(String orderId) {
        commandRepo.findById(orderId).ifPresent(order -> {
            var items = order.getItems().stream()
                    .map(i -> new OrderItemView(
                            i.productId(), i.productName(),
                            i.unitPrice(), i.quantity(), i.subtotal()))
                    .toList();

            var readModel = new OrderReadModel(
                    order.getId(),
                    order.getCustomerId(),
                    items,
                    order.getTotalAmount(),
                    order.getStatus().name(),
                    order.getCreatedAt().toString());

            queryRepo.sync(readModel);
        });
    }

    public List<DomainEvent> getPublishedEvents() {
        return Collections.unmodifiableList(publishedEvents);
    }

    public void clear() { publishedEvents.clear(); }
}
