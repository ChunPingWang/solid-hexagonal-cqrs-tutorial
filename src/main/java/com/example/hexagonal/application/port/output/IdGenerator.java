package com.example.hexagonal.application.port.output;

/**
 * Output Port - ID 產生器。
 * <p>
 * 遵循 DIP：核心不依賴具體的 ID 生成策略。
 * 遵循 LSP：UuidGenerator 與 FixedIdGenerator 可互換。
 */
public interface IdGenerator {
    String generate();
}
