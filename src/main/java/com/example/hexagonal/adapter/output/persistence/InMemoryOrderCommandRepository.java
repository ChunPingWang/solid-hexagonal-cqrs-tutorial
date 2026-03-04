package com.example.hexagonal.adapter.output.persistence;

// ============================================================
// Driven Adapter - 記憶體版訂單命令儲存庫
// ============================================================
// 遵循 LSP：可被 PostgresOrderRepository 無縫替換。
// 遵循 DIP：實作由 BeanConfiguration 注入。
// ============================================================

import com.example.hexagonal.application.port.output.OrderCommandRepository;
import com.example.hexagonal.domain.model.Order;
import com.example.hexagonal.domain.model.OrderItem;
import com.example.hexagonal.domain.model.OrderStatus;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public class InMemoryOrderCommandRepository implements OrderCommandRepository {

    private final Map<String, StoredOrder> store = new ConcurrentHashMap<>();

    @Override
    public void save(Order order) {
        var items = order.getItems().stream()
                .map(i -> new StoredItem(i.productId(), i.productName(), i.unitPrice(), i.quantity()))
                .toList();

        store.put(order.getId(), new StoredOrder(
                order.getId(), order.getCustomerId(),
                items, order.getStatus(), order.getCreatedAt()));
    }

    @Override
    public Optional<Order> findById(String id) {
        var stored = store.get(id);
        if (stored == null) return Optional.empty();

        var items = stored.items().stream()
                .map(i -> new OrderItem(i.productId(), i.productName(), i.unitPrice(), i.quantity()))
                .toList();

        return Optional.of(Order.reconstruct(
                stored.id(), stored.customerId(),
                items, stored.status(), stored.createdAt()));
    }

    public void clear() { store.clear(); }
    public int size() { return store.size(); }

    private record StoredOrder(String id, String customerId,
                               List<StoredItem> items, OrderStatus status, Instant createdAt) {}
    private record StoredItem(String productId, String productName, double unitPrice, int quantity) {}
}
