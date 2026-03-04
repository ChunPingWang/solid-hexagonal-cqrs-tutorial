package com.example.hexagonal.adapter.input.rest;

// ============================================================
// Driving Adapter - REST Controller
// ============================================================
// 六角形架構中的驅動適配器。
// 將 HTTP 請求轉換為 Use Case 呼叫。
// 這是唯一使用 Spring 注解的 Controller 類別。
//
// SRP: 只負責 HTTP ↔ Use Case 的轉換
// DIP: 依賴 Use Case 介面，不依賴具體 Handler
// ISP: 注入多個小介面而非一個大介面
// ============================================================

import com.example.hexagonal.adapter.input.rest.dto.CancelOrderRequest;
import com.example.hexagonal.adapter.input.rest.dto.CreateOrderRequest;
import com.example.hexagonal.application.dto.CreateOrderInput;
import com.example.hexagonal.application.port.input.*;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderRestController {

    private final CreateOrderUseCase createOrderUseCase;
    private final GetOrderUseCase getOrderUseCase;
    private final ListOrdersUseCase listOrdersUseCase;
    private final ConfirmOrderUseCase confirmOrderUseCase;
    private final CancelOrderUseCase cancelOrderUseCase;

    public OrderRestController(CreateOrderUseCase createOrderUseCase,
                               GetOrderUseCase getOrderUseCase,
                               ListOrdersUseCase listOrdersUseCase,
                               ConfirmOrderUseCase confirmOrderUseCase,
                               CancelOrderUseCase cancelOrderUseCase) {
        this.createOrderUseCase = createOrderUseCase;
        this.getOrderUseCase = getOrderUseCase;
        this.listOrdersUseCase = listOrdersUseCase;
        this.confirmOrderUseCase = confirmOrderUseCase;
        this.cancelOrderUseCase = cancelOrderUseCase;
    }

    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody CreateOrderRequest request) {
        var input = new CreateOrderInput(request.customerId(), request.items());
        var result = createOrderUseCase.execute(input);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOrder(@PathVariable String id) {
        return ResponseEntity.ok(getOrderUseCase.execute(id));
    }

    @GetMapping
    public ResponseEntity<?> listOrders(
            @RequestParam(required = false) String customerId) {
        return ResponseEntity.ok(listOrdersUseCase.execute(customerId));
    }

    @PostMapping("/{id}/confirm")
    public ResponseEntity<?> confirmOrder(@PathVariable String id) {
        return ResponseEntity.ok(confirmOrderUseCase.execute(id));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelOrder(@PathVariable String id,
                                         @RequestBody CancelOrderRequest request) {
        return ResponseEntity.ok(cancelOrderUseCase.execute(id, request.reason()));
    }
}
