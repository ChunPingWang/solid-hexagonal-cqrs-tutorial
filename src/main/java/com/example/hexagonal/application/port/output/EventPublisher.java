package com.example.hexagonal.application.port.output;

import com.example.hexagonal.domain.event.DomainEvent;

import java.util.List;

/**
 * Output Port - 事件發布者介面。
 * <p>
 * 遵循 OCP：新增事件類型不需要修改此介面。
 * 遵循 DIP：Application 層定義介面，Adapter 層實作。
 */
public interface EventPublisher {
    void publish(DomainEvent event);
    void publishAll(List<DomainEvent> events);
}
