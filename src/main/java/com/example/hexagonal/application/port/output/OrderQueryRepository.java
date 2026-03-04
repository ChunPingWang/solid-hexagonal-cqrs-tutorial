package com.example.hexagonal.application.port.output;

import com.example.hexagonal.application.dto.OrderReadModel;

import java.util.List;
import java.util.Optional;

/**
 * Output Port - CQRS 讀取端儲存庫。
 * <p>
 * 讀取端使用扁平化的 {@link OrderReadModel}，而非 Domain Model。
 */
public interface OrderQueryRepository {
    Optional<OrderReadModel> findById(String id);
    List<OrderReadModel> findAll();
    List<OrderReadModel> findByCustomerId(String customerId);
}
