package com.example.hexagonal.infrastructure.config;

// ============================================================
// Dependency Injection Container - 依賴注入容器
// ============================================================
// 這是整個六角形架構的「組裝」層，使用 Spring @Bean 將所有元件連接。
//
// 關鍵設計：Domain 層和 Application 層不使用任何 Spring 注解，
// 由此 @Configuration 類別統一管理所有 Bean 的建立和依賴注入。
// 這確保了核心程式碼對 Spring 框架的零依賴。
//
// DIP 的完美體現：此處是唯一知道所有具體類別的地方。
// ============================================================

import com.example.hexagonal.adapter.output.UuidGeneratorAdapter;
import com.example.hexagonal.adapter.output.messaging.InMemoryEventPublisher;
import com.example.hexagonal.adapter.output.persistence.InMemoryOrderCommandRepository;
import com.example.hexagonal.adapter.output.persistence.InMemoryOrderQueryRepository;
import com.example.hexagonal.application.command.CancelOrderHandler;
import com.example.hexagonal.application.command.ConfirmOrderHandler;
import com.example.hexagonal.application.command.CreateOrderHandler;
import com.example.hexagonal.application.port.input.*;
import com.example.hexagonal.application.port.output.*;
import com.example.hexagonal.application.query.GetOrderHandler;
import com.example.hexagonal.application.query.ListOrdersHandler;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class BeanConfiguration {

    // === 第一步：被驅動適配器（Output Adapters）===

    @Bean
    public InMemoryOrderCommandRepository orderCommandRepository() {
        return new InMemoryOrderCommandRepository();
    }

    @Bean
    public InMemoryOrderQueryRepository orderQueryRepository() {
        return new InMemoryOrderQueryRepository();
    }

    @Bean
    public EventPublisher eventPublisher(InMemoryOrderCommandRepository commandRepo,
                                         InMemoryOrderQueryRepository queryRepo) {
        return new InMemoryEventPublisher(commandRepo, queryRepo);
    }

    @Bean
    public IdGenerator idGenerator() {
        return new UuidGeneratorAdapter();
    }

    // === 第二步：Application Handlers ===

    @Bean
    public CreateOrderUseCase createOrderUseCase(InMemoryOrderCommandRepository commandRepo,
                                                  EventPublisher eventPublisher,
                                                  IdGenerator idGenerator) {
        return new CreateOrderHandler(commandRepo, eventPublisher, idGenerator);
    }

    @Bean
    public ConfirmOrderUseCase confirmOrderUseCase(InMemoryOrderCommandRepository commandRepo,
                                                    EventPublisher eventPublisher) {
        return new ConfirmOrderHandler(commandRepo, eventPublisher);
    }

    @Bean
    public CancelOrderUseCase cancelOrderUseCase(InMemoryOrderCommandRepository commandRepo,
                                                  EventPublisher eventPublisher) {
        return new CancelOrderHandler(commandRepo, eventPublisher);
    }

    @Bean
    public GetOrderUseCase getOrderUseCase(InMemoryOrderQueryRepository queryRepo) {
        return new GetOrderHandler(queryRepo);
    }

    @Bean
    public ListOrdersUseCase listOrdersUseCase(InMemoryOrderQueryRepository queryRepo) {
        return new ListOrdersHandler(queryRepo);
    }
}
