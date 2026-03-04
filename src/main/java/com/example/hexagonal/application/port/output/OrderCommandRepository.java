package com.example.hexagonal.application.port.output;

import com.example.hexagonal.domain.model.Order;

import java.util.Optional;

/**
 * Output Port - CQRS 寫入端儲存庫。
 * <p>
 * 遵循 ISP：只定義寫入端需要的方法，與 QueryRepository 分離。
 */
public interface OrderCommandRepository {
    void save(Order order);
    Optional<Order> findById(String id);
}
