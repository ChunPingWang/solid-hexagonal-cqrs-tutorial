package com.example.hexagonal.application.port.input;

import com.example.hexagonal.application.dto.CreateOrderInput;
import com.example.hexagonal.application.dto.CreateOrderOutput;

/**
 * Input Port - 建立訂單用例介面。
 * <p>
 * 遵循 DIP：外部 Controller 依賴此抽象介面。
 * 遵循 ISP：每個用例是獨立介面。
 */
public interface CreateOrderUseCase {
    CreateOrderOutput execute(CreateOrderInput input);
}
