package com.example.hexagonal.adapter.output.persistence;

// ============================================================
// Driven Adapter - 記憶體版 CQRS 查詢儲存庫
// ============================================================
// 讀取模型是扁平化、非正規化的資料結構，可直接回傳給前端。
// ============================================================

import com.example.hexagonal.application.dto.OrderReadModel;
import com.example.hexagonal.application.port.output.OrderQueryRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

public class InMemoryOrderQueryRepository implements OrderQueryRepository {

    private final Map<String, OrderReadModel> store = new ConcurrentHashMap<>();

    /** 同步讀取模型（事件發布後呼叫） */
    public void sync(OrderReadModel readModel) {
        store.put(readModel.id(), readModel);
    }

    @Override
    public Optional<OrderReadModel> findById(String id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public List<OrderReadModel> findAll() {
        return List.copyOf(store.values());
    }

    @Override
    public List<OrderReadModel> findByCustomerId(String customerId) {
        return store.values().stream()
                .filter(rm -> rm.customerId().equals(customerId))
                .toList();
    }

    public void clear() { store.clear(); }
}
