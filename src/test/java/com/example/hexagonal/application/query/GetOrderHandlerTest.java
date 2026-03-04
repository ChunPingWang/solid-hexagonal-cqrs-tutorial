package com.example.hexagonal.application.query;

import com.example.hexagonal.adapter.output.FixedIdGenerator;
import com.example.hexagonal.adapter.output.messaging.InMemoryEventPublisher;
import com.example.hexagonal.adapter.output.persistence.InMemoryOrderCommandRepository;
import com.example.hexagonal.adapter.output.persistence.InMemoryOrderQueryRepository;
import com.example.hexagonal.application.command.CreateOrderHandler;
import com.example.hexagonal.application.dto.CreateOrderInput;
import com.example.hexagonal.application.dto.OrderItemInput;
import com.example.hexagonal.domain.exception.OrderNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

@DisplayName("GetOrderHandler / ListOrdersHandler（CQRS 查詢端）")
class GetOrderHandlerTest {

    private InMemoryOrderQueryRepository queryRepo;
    private GetOrderHandler getHandler;
    private ListOrdersHandler listHandler;
    private CreateOrderHandler createHandler;

    @BeforeEach
    void setUp() {
        var commandRepo = new InMemoryOrderCommandRepository();
        queryRepo = new InMemoryOrderQueryRepository();
        var eventPublisher = new InMemoryEventPublisher(commandRepo, queryRepo);
        getHandler = new GetOrderHandler(queryRepo);
        listHandler = new ListOrdersHandler(queryRepo);
        createHandler = new CreateOrderHandler(commandRepo, eventPublisher,
                new FixedIdGenerator("order-1", "order-2"));
    }

    @Test
    void 應該能查詢已建立的訂單() {
        createHandler.execute(new CreateOrderInput("c1", List.of(
                new OrderItemInput("p1", "鍵盤", 2500, 1))));

        var view = getHandler.execute("order-1");
        assertThat(view.id()).isEqualTo("order-1");
        assertThat(view.totalAmount()).isEqualTo(2500);
    }

    @Test
    void 查詢不存在的訂單應該拋出錯誤() {
        assertThatThrownBy(() -> getHandler.execute("non-existent"))
                .isInstanceOf(OrderNotFoundException.class);
    }

    @Test
    void 應該能列出所有訂單() {
        createHandler.execute(new CreateOrderInput("c1", List.of(
                new OrderItemInput("p1", "鍵盤", 2500, 1))));
        createHandler.execute(new CreateOrderInput("c2", List.of(
                new OrderItemInput("p2", "滑鼠", 800, 1))));

        var all = listHandler.execute(null);
        assertThat(all).hasSize(2);
    }

    @Test
    void 應該能依客戶ID篩選訂單() {
        createHandler.execute(new CreateOrderInput("c1", List.of(
                new OrderItemInput("p1", "鍵盤", 2500, 1))));
        createHandler.execute(new CreateOrderInput("c2", List.of(
                new OrderItemInput("p2", "滑鼠", 800, 1))));

        var filtered = listHandler.execute("c1");
        assertThat(filtered).hasSize(1);
        assertThat(filtered.getFirst().customerId()).isEqualTo("c1");
    }
}
