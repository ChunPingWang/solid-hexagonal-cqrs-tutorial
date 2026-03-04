package com.example.hexagonal.adapter.input.rest;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("OrderRestController（Spring Boot 整合測試）")
class OrderRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private String createOrderJson() {
        return """
                {
                  "customerId": "c1",
                  "items": [
                    {"productId": "p1", "productName": "鍵盤", "unitPrice": 2500, "quantity": 1},
                    {"productId": "p2", "productName": "滑鼠", "unitPrice": 800, "quantity": 2}
                  ]
                }
                """;
    }

    private String createOrder() throws Exception {
        var result = mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createOrderJson()))
                .andExpect(status().isCreated())
                .andReturn();

        // 從 JSON 回應中提取 orderId
        var body = result.getResponse().getContentAsString();
        return body.split("\"orderId\":\"")[1].split("\"")[0];
    }

    @Test
    void 建立訂單應該回傳201() throws Exception {
        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createOrderJson()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.orderId").exists())
                .andExpect(jsonPath("$.totalAmount").value(4100))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.itemCount").value(2));
    }

    @Test
    void 查詢訂單應該回傳200() throws Exception {
        var orderId = createOrder();

        mockMvc.perform(get("/api/orders/" + orderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(orderId))
                .andExpect(jsonPath("$.totalAmount").value(4100))
                .andExpect(jsonPath("$.items.length()").value(2));
    }

    @Test
    void 查詢不存在的訂單應該回傳404() throws Exception {
        mockMvc.perform(get("/api/orders/non-existent"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("找不到訂單: non-existent"));
    }

    @Test
    void 列出所有訂單應該回傳200() throws Exception {
        createOrder();

        mockMvc.perform(get("/api/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)));
    }

    @Test
    void 確認訂單應該回傳200() throws Exception {
        var orderId = createOrder();

        mockMvc.perform(post("/api/orders/" + orderId + "/confirm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }

    @Test
    void 取消訂單應該回傳200() throws Exception {
        var orderId = createOrder();

        mockMvc.perform(post("/api/orders/" + orderId + "/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason": "客戶取消"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.reason").value("客戶取消"));
    }

    @Test
    void 完整訂單生命週期_建立_查詢_確認_取消() throws Exception {
        // 1. 建立
        var orderId = createOrder();

        // 2. 查詢
        mockMvc.perform(get("/api/orders/" + orderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"));

        // 3. 確認
        mockMvc.perform(post("/api/orders/" + orderId + "/confirm"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        // 4. 取消
        mockMvc.perform(post("/api/orders/" + orderId + "/cancel")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason": "客戶要求取消"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        // 5. 驗證最終狀態
        mockMvc.perform(get("/api/orders/" + orderId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }
}
