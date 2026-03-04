package com.example.hexagonal.domain.exception;

public class OrderNotFoundException extends DomainException {

    public OrderNotFoundException(String orderId) {
        super("找不到訂單: " + orderId);
    }
}
