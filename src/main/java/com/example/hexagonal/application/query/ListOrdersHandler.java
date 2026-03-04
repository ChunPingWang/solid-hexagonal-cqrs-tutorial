package com.example.hexagonal.application.query;

import com.example.hexagonal.application.dto.OrderView;
import com.example.hexagonal.application.port.input.ListOrdersUseCase;
import com.example.hexagonal.application.port.output.OrderQueryRepository;

import java.util.List;

public class ListOrdersHandler implements ListOrdersUseCase {

    private final OrderQueryRepository queryRepository;

    public ListOrdersHandler(OrderQueryRepository queryRepository) {
        this.queryRepository = queryRepository;
    }

    @Override
    public List<OrderView> execute(String customerId) {
        var readModels = (customerId != null && !customerId.isBlank())
                ? queryRepository.findByCustomerId(customerId)
                : queryRepository.findAll();

        return readModels.stream()
                .map(rm -> new OrderView(
                        rm.id(), rm.customerId(), rm.items(),
                        rm.totalAmount(), rm.status(), rm.createdAt()))
                .toList();
    }
}
