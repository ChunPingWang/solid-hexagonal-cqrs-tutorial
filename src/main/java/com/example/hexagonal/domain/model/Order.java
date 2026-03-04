package com.example.hexagonal.domain.model;

// ============================================================
// Order Aggregate Root - 訂單聚合根
// ============================================================
// 聚合根是 DDD 的核心概念，負責維護聚合邊界內的資料一致性。
//
// SOLID 原則體現：
// - SRP: Order 只負責訂單的業務邏輯
// - OCP: 可透過新增事件類型來擴展行為，而不修改現有邏輯
// - LSP: Order 的所有狀態轉換都保持一致的行為契約
// ============================================================

import com.example.hexagonal.domain.event.*;
import com.example.hexagonal.domain.exception.InvalidOrderOperationException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Order {

    private final String id;
    private final String customerId;
    private final Instant createdAt;
    private final List<OrderItem> items = new ArrayList<>();
    private final List<DomainEvent> domainEvents = new ArrayList<>();
    private OrderStatus status = OrderStatus.DRAFT;

    private Order(String id, String customerId, Instant createdAt) {
        if (id == null || id.isBlank()) {
            throw new InvalidOrderOperationException("訂單 ID 不能為空");
        }
        if (customerId == null || customerId.isBlank()) {
            throw new InvalidOrderOperationException("客戶 ID 不能為空");
        }
        this.id = id;
        this.customerId = customerId;
        this.createdAt = createdAt;
    }

    // ---- 查詢方法 ----

    public String getId() { return id; }

    public String getCustomerId() { return customerId; }

    public Instant getCreatedAt() { return createdAt; }

    public OrderStatus getStatus() { return status; }

    public List<OrderItem> getItems() { return Collections.unmodifiableList(items); }

    public double getTotalAmount() {
        return items.stream().mapToDouble(OrderItem::subtotal).sum();
    }

    public List<DomainEvent> getDomainEvents() { return Collections.unmodifiableList(domainEvents); }

    // ---- 指令方法 ----

    public void addItem(OrderItem item) {
        if (status != OrderStatus.DRAFT) {
            throw new InvalidOrderOperationException("無法在 " + status + " 狀態下新增項目");
        }
        items.add(item);
        domainEvents.add(new OrderItemAddedEvent(id, item.productId(), item.quantity()));
    }

    public void confirm() {
        if (status != OrderStatus.DRAFT) {
            throw new InvalidOrderOperationException("無法從 " + status + " 狀態確認訂單");
        }
        if (items.isEmpty()) {
            throw new InvalidOrderOperationException("訂單必須至少有一個項目才能確認");
        }
        status = OrderStatus.CONFIRMED;
        domainEvents.add(new OrderConfirmedEvent(id));
    }

    public void cancel(String reason) {
        if (status == OrderStatus.CANCELLED) {
            throw new InvalidOrderOperationException("訂單已經被取消");
        }
        status = OrderStatus.CANCELLED;
        domainEvents.add(new OrderCancelledEvent(id, reason));
    }

    public void clearEvents() {
        domainEvents.clear();
    }

    // ---- 工廠方法 ----

    public static Order create(String id, String customerId) {
        var order = new Order(id, customerId, Instant.now());
        order.domainEvents.add(new OrderCreatedEvent(id, customerId, 0));
        return order;
    }

    public static Order reconstruct(String id, String customerId,
                                     List<OrderItem> items, OrderStatus status,
                                     Instant createdAt) {
        var order = new Order(id, customerId, createdAt);
        order.items.addAll(items);
        order.status = status;
        return order;
    }
}
