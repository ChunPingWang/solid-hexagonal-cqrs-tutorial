package com.example.hexagonal.domain.event;

// ============================================================
// Domain Event - 領域事件
// ============================================================
// 使用 Java 21 sealed interface + record：
// - sealed 限制可實作的子類型，編譯期安全
// - record 提供不可變的事件資料結構
//
// OCP 體現：新增事件只需新增 record 並加入 permits 清單
// ============================================================

import java.time.Instant;

public sealed interface DomainEvent
        permits OrderCreatedEvent, OrderItemAddedEvent, OrderConfirmedEvent, OrderCancelledEvent {

    String eventId();

    String eventType();

    Instant occurredOn();

    String aggregateId();
}
