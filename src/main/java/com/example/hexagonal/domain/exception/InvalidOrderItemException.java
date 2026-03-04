package com.example.hexagonal.domain.exception;

public class InvalidOrderItemException extends DomainException {

    public InvalidOrderItemException(String message) {
        super("無效的訂單項目: " + message);
    }
}
