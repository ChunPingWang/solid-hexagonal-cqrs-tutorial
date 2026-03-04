package com.example.hexagonal.application.command;

import com.example.hexagonal.adapter.output.FixedIdGenerator;
import com.example.hexagonal.adapter.output.messaging.InMemoryEventPublisher;
import com.example.hexagonal.adapter.output.persistence.InMemoryOrderCommandRepository;
import com.example.hexagonal.adapter.output.persistence.InMemoryOrderQueryRepository;
import com.example.hexagonal.application.dto.CreateOrderInput;
import com.example.hexagonal.application.dto.OrderItemInput;
import com.example.hexagonal.domain.exception.OrderNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

class ConfirmAndCancelHandlerTest {

    private InMemoryOrderCommandRepository commandRepo;
    private InMemoryOrderQueryRepository queryRepo;
    private InMemoryEventPublisher eventPublisher;
    private CreateOrderHandler createHandler;
    private ConfirmOrderHandler confirmHandler;
    private CancelOrderHandler cancelHandler;

    @BeforeEach
    void setUp() {
        commandRepo = new InMemoryOrderCommandRepository();
        queryRepo = new InMemoryOrderQueryRepository();
        eventPublisher = new InMemoryEventPublisher(commandRepo, queryRepo);
        createHandler = new CreateOrderHandler(commandRepo, eventPublisher, new FixedIdGenerator("order-1"));
        confirmHandler = new ConfirmOrderHandler(commandRepo, eventPublisher);
        cancelHandler = new CancelOrderHandler(commandRepo, eventPublisher);
    }

    private void createTestOrder() {
        createHandler.execute(new CreateOrderInput("c1", List.of(
                new OrderItemInput("p1", "鍵盤", 2500, 1)
        )));
    }

    @Nested
    @DisplayName("ConfirmOrderHandler")
    class ConfirmTests {

        @Test
        void 應該成功確認訂單() {
            createTestOrder();
            var output = confirmHandler.execute("order-1");
            assertThat(output.status()).isEqualTo("CONFIRMED");
            assertThat(output.totalAmount()).isEqualTo(2500);
        }

        @Test
        void 不存在的訂單應該拋出OrderNotFoundError() {
            assertThatThrownBy(() -> confirmHandler.execute("non-existent"))
                    .isInstanceOf(OrderNotFoundException.class)
                    .hasMessageContaining("找不到訂單");
        }

        @Test
        void 確認後讀取模型應該同步更新() {
            createTestOrder();
            confirmHandler.execute("order-1");
            var readModel = queryRepo.findById("order-1");
            assertThat(readModel).isPresent();
            assertThat(readModel.get().status()).isEqualTo("CONFIRMED");
        }
    }

    @Nested
    @DisplayName("CancelOrderHandler")
    class CancelTests {

        @Test
        void 應該成功取消訂單() {
            createTestOrder();
            var output = cancelHandler.execute("order-1", "客戶取消");
            assertThat(output.status()).isEqualTo("CANCELLED");
            assertThat(output.reason()).isEqualTo("客戶取消");
        }

        @Test
        void 不存在的訂單應該拋出OrderNotFoundError() {
            assertThatThrownBy(() -> cancelHandler.execute("non-existent", "reason"))
                    .isInstanceOf(OrderNotFoundException.class);
        }
    }
}
