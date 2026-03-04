package com.example.hexagonal.adapter.output;

import com.example.hexagonal.application.port.output.IdGenerator;

import java.util.UUID;

/** 生產環境用的 UUID 產生器 */
public class UuidGeneratorAdapter implements IdGenerator {

    @Override
    public String generate() {
        return UUID.randomUUID().toString();
    }
}

