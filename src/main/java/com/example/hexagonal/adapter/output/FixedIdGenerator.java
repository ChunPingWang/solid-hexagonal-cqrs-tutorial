package com.example.hexagonal.adapter.output;

import com.example.hexagonal.application.port.output.IdGenerator;

/**
 * 測試用固定 ID 產生器。
 * 遵循 LSP：可完全替代 UuidGeneratorAdapter。
 */
public class FixedIdGenerator implements IdGenerator {

    private final String[] ids;
    private int index = 0;

    public FixedIdGenerator(String... ids) {
        this.ids = ids.length > 0 ? ids : new String[]{"test-id-1"};
    }

    @Override
    public String generate() {
        var id = ids[index % ids.length];
        index++;
        return id;
    }
}
