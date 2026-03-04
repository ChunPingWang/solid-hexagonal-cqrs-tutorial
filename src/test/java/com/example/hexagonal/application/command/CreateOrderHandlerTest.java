package com.example.hexagonal.application.command;

import com.example.hexagonal.adapter.output.FixedIdGenerator;
import com.example.hexagonal.adapter.output.messaging.InMemoryEventPublisher;
import com.example.hexagonal.adapter.output.persistence.InMemoryOrderCommandRepository;
import com.example.hexagonal.adapter.output.persistence.InMemoryOrderQueryRepository;
import com.example.hexagonal.application.dto.CreateOrderInput;
import com.example.hexagonal.application.dto.OrderItemInput;
import com.example.hexagonal.domain.exception.InvalidOrderItemException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

@DisplayName("CreateOrderHandler（Command Handler）")
class CreateOrderHandlerTest {

    private InMemoryOrderCommandRepository commandRepo;
    private InMemoryOrderQueryRepository queryRepo;
    private InMemoryEventPublisher eventPublisher;
    private CreateOrderHandler handler;

    @BeforeEach
    void setUp() {
        commandRepo = new InMemoryOrderCommandRepository();
        queryRepo = new InMemoryOrderQueryRepository();
        eventPublisher = new InMemoryEventPublisher(commandRepo, queryRepo);
        handler = new CreateOrderHandler(commandRepo, eventPublisher, new FixedIdGenerator("order-1"));
    }

    @Test
    void 應該成功建立訂單() {
        var input = new CreateOrderInput("c1", List.of(
                new OrderItemInput("p1", "鍵盤", 2500, 1)
        ));

        var output = handler.execute(input);

        assertThat(output.orderId()).isEqualTo("order-1");
        assertThat(output.totalAmount()).isEqualTo(2500);
        assertThat(output.status()).isEqualTo("DRAFT");
        assertThat(output.itemCount()).isEqualTo(1);
    }

    @Test
    void 應該將訂單儲存到命令儲存庫() {
        var input = new CreateOrderInput("c1", List.of(
                new OrderItemInput("p1", "鍵盤", 2500, 1)
        ));

        handler.execute(input);

        assertThat(commandRepo.size()).isEqualTo(1);
        assertThat(commandRepo.findById("order-1")).isPresent();
    }

    @Test
    void 應該發布領域事件() {
        var input = new CreateOrderInput("c1", List.of(
                new OrderItemInput("p1", "鍵盤", 2500, 1)
        ));

        handler.execute(input);

        // OrderCreated + OrderItemAdded
        assertThat(eventPublisher.getPublishedEvents()).hasSizeGreaterThanOrEqualTo(2);
    }

    @Test
    void 應該同步讀取模型_CQRS查詢端() {
        var input = new CreateOrderInput("c1", List.of(
                new OrderItemInput("p1", "鍵盤", 2500, 1),
                new OrderItemInput("p2", "滑鼠", 800, 2)
        ));

        handler.execute(input);

        var readModel = queryRepo.findById("order-1");
        assertThat(readModel).isPresent();
        assertThat(readModel.get().totalAmount()).isEqualTo(4100);
        assertThat(readModel.get().items()).hasSize(2);
    }

    @Test
    void 無效的訂單項目應該拋出錯誤() {
        var input = new CreateOrderInput("c1", List.of(
                new OrderItemInput("", "鍵盤", 2500, 1)
        ));

        assertThatThrownBy(() -> handler.execute(input))
                .isInstanceOf(InvalidOrderItemException.class);
    }
}
