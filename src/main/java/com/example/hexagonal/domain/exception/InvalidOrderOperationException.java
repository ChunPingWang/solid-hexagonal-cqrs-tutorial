package com.example.hexagonal.domain.exception;

public class InvalidOrderOperationException extends DomainException {

    public InvalidOrderOperationException(String message) {
        super("無效的訂單操作: " + message);
    }
}
