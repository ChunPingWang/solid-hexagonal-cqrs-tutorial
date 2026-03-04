package com.example.hexagonal.domain.model;

import com.example.hexagonal.domain.exception.InvalidOrderItemException;
import com.example.hexagonal.domain.exception.InvalidOrderOperationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

@DisplayName("Domain Layer 測試")
class OrderTest {

    // ── Product 值物件 ──

    @Nested
    @DisplayName("Product（產品值物件）")
    class ProductTest {

        @Test
        void 應該能建立有效的產品() {
            var product = new Product("p1", "鍵盤", 2500);
            assertThat(product.id()).isEqualTo("p1");
            assertThat(product.name()).isEqualTo("鍵盤");
            assertThat(product.price()).isEqualTo(2500);
        }

        @Test
        void 空ID應該拋出錯誤() {
            assertThatThrownBy(() -> new Product("", "鍵盤", 2500))
                    .hasMessageContaining("產品 ID 不能為空");
        }

        @Test
        void 空名稱應該拋出錯誤() {
            assertThatThrownBy(() -> new Product("p1", "", 2500))
                    .hasMessageContaining("產品名稱不能為空");
        }

        @Test
        void 負價格應該拋出錯誤() {
            assertThatThrownBy(() -> new Product("p1", "鍵盤", -1))
                    .hasMessageContaining("產品價格不能為負數");
        }
    }

    // ── OrderItem 值物件 ──

    @Nested
    @DisplayName("OrderItem（訂單項目值物件）")
    class OrderItemTest {

        @Test
        void 應該正確計算小計() {
            var item = new OrderItem("p1", "鍵盤", 2500, 3);
            assertThat(item.subtotal()).isEqualTo(7500);
        }

        @Test
        void 數量為0應該拋出錯誤() {
            assertThatThrownBy(() -> new OrderItem("p1", "鍵盤", 2500, 0))
                    .isInstanceOf(InvalidOrderItemException.class)
                    .hasMessageContaining("數量必須大於 0");
        }

        @Test
        void 負數量應該拋出錯誤() {
            assertThatThrownBy(() -> new OrderItem("p1", "鍵盤", 2500, -1))
                    .isInstanceOf(InvalidOrderItemException.class);
        }

        @Test
        void 空產品ID應該拋出錯誤() {
            assertThatThrownBy(() -> new OrderItem("", "鍵盤", 2500, 1))
                    .isInstanceOf(InvalidOrderItemException.class)
                    .hasMessageContaining("產品 ID 不能為空");
        }
    }

    // ── Order 聚合根 ──

    @Nested
    @DisplayName("Order（訂單聚合根）- 建立")
    class OrderCreation {

        @Test
        void 應該能用工廠方法建立訂單() {
            var order = Order.create("o1", "c1");
            assertThat(order.getId()).isEqualTo("o1");
            assertThat(order.getCustomerId()).isEqualTo("c1");
            assertThat(order.getStatus()).isEqualTo(OrderStatus.DRAFT);
            assertThat(order.getItems()).isEmpty();
        }

        @Test
        void 應該產生OrderCreated事件() {
            var order = Order.create("o1", "c1");
            assertThat(order.getDomainEvents()).hasSize(1);
            assertThat(order.getDomainEvents().getFirst().eventType()).isEqualTo("OrderCreated");
        }

        @Test
        void 空訂單ID應該拋出錯誤() {
            assertThatThrownBy(() -> Order.create("", "c1"))
                    .isInstanceOf(InvalidOrderOperationException.class)
                    .hasMessageContaining("訂單 ID 不能為空");
        }

        @Test
        void 空客戶ID應該拋出錯誤() {
            assertThatThrownBy(() -> Order.create("o1", ""))
                    .isInstanceOf(InvalidOrderOperationException.class)
                    .hasMessageContaining("客戶 ID 不能為空");
        }
    }

    @Nested
    @DisplayName("Order - 新增項目")
    class OrderAddItem {

        @Test
        void 應該能新增訂單項目() {
            var order = Order.create("o1", "c1");
            order.addItem(new OrderItem("p1", "鍵盤", 2500, 1));
            assertThat(order.getItems()).hasSize(1);
            assertThat(order.getTotalAmount()).isEqualTo(2500);
        }

        @Test
        void 應該能新增多個項目並正確計算總額() {
            var order = Order.create("o1", "c1");
            order.addItem(new OrderItem("p1", "鍵盤", 2500, 1));
            order.addItem(new OrderItem("p2", "滑鼠", 800, 2));
            assertThat(order.getItems()).hasSize(2);
            assertThat(order.getTotalAmount()).isEqualTo(4100);
        }

        @Test
        void 應該產生OrderItemAdded事件() {
            var order = Order.create("o1", "c1");
            order.addItem(new OrderItem("p1", "鍵盤", 2500, 1));
            assertThat(order.getDomainEvents()).hasSize(2); // Created + ItemAdded
            assertThat(order.getDomainEvents().get(1).eventType()).isEqualTo("OrderItemAdded");
        }
    }

    @Nested
    @DisplayName("Order - 確認訂單")
    class OrderConfirm {

        @Test
        void 有項目的DRAFT訂單應該能被確認() {
            var order = Order.create("o1", "c1");
            order.addItem(new OrderItem("p1", "鍵盤", 2500, 1));
            order.confirm();
            assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        }

        @Test
        void 空訂單不能被確認() {
            var order = Order.create("o1", "c1");
            assertThatThrownBy(order::confirm)
                    .isInstanceOf(InvalidOrderOperationException.class)
                    .hasMessageContaining("至少有一個項目");
        }

        @Test
        void 已確認的訂單不能再次確認() {
            var order = Order.create("o1", "c1");
            order.addItem(new OrderItem("p1", "鍵盤", 2500, 1));
            order.confirm();
            assertThatThrownBy(order::confirm)
                    .isInstanceOf(InvalidOrderOperationException.class);
        }

        @Test
        void 確認後不能新增項目() {
            var order = Order.create("o1", "c1");
            order.addItem(new OrderItem("p1", "鍵盤", 2500, 1));
            order.confirm();
            assertThatThrownBy(() -> order.addItem(new OrderItem("p2", "滑鼠", 800, 1)))
                    .isInstanceOf(InvalidOrderOperationException.class);
        }
    }

    @Nested
    @DisplayName("Order - 取消訂單")
    class OrderCancel {

        @Test
        void DRAFT訂單可以被取消() {
            var order = Order.create("o1", "c1");
            order.cancel("不需要了");
            assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        }

        @Test
        void CONFIRMED訂單可以被取消() {
            var order = Order.create("o1", "c1");
            order.addItem(new OrderItem("p1", "鍵盤", 2500, 1));
            order.confirm();
            order.cancel("客戶取消");
            assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        }

        @Test
        void 已取消的訂單不能再次取消() {
            var order = Order.create("o1", "c1");
            order.cancel("不需要了");
            assertThatThrownBy(() -> order.cancel("再次取消"))
                    .isInstanceOf(InvalidOrderOperationException.class)
                    .hasMessageContaining("已經被取消");
        }

        @Test
        void 取消後應該產生OrderCancelled事件() {
            var order = Order.create("o1", "c1");
            order.cancel("不需要了");
            var events = order.getDomainEvents();
            assertThat(events.getLast().eventType()).isEqualTo("OrderCancelled");
        }
    }

    @Nested
    @DisplayName("Order - 事件管理")
    class OrderEvents {

        @Test
        void clearEvents應該清除所有事件() {
            var order = Order.create("o1", "c1");
            order.addItem(new OrderItem("p1", "鍵盤", 2500, 1));
            assertThat(order.getDomainEvents()).isNotEmpty();
            order.clearEvents();
            assertThat(order.getDomainEvents()).isEmpty();
        }
    }

    @Nested
    @DisplayName("Order - reconstruct")
    class OrderReconstruct {

        @Test
        void 應該能從持久化資料重建訂單() {
            var items = java.util.List.of(new OrderItem("p1", "鍵盤", 2500, 1));
            var order = Order.reconstruct("o1", "c1", items,
                    OrderStatus.CONFIRMED, java.time.Instant.now());
            assertThat(order.getId()).isEqualTo("o1");
            assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
            assertThat(order.getItems()).hasSize(1);
            assertThat(order.getDomainEvents()).isEmpty(); // reconstruct 不產生事件
        }
    }
}
