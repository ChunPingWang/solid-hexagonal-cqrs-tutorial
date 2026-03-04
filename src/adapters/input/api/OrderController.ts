// ============================================================
// Driving Adapter - 訂單控制器
// ============================================================
// 這是六角形架構中的「驅動適配器」(Driving Adapter)。
// 它將外部的 HTTP 請求轉換為應用層的 Use Case 呼叫。
//
// 在真實場景中，這會與 Express、Fastify 等框架整合。
// 此處使用簡單的方法呼叫來模擬 REST API。
//
// SOLID 原則體現：
// - SRP: 只負責將外部請求轉換為 Use Case 呼叫
// - DIP: 依賴 Use Case 介面，而非具體 Handler
// - ISP: 使用多個小介面而非一個大介面
// ============================================================

import { CreateOrderUseCase, CreateOrderInput } from '../../../application/ports/input/CreateOrderUseCase';
import { GetOrderUseCase, ListOrdersUseCase } from '../../../application/ports/input/GetOrderUseCase';
import { ConfirmOrderUseCase } from '../../../application/ports/input/ConfirmOrderUseCase';
import { CancelOrderUseCase } from '../../../application/ports/input/CancelOrderUseCase';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getOrderUseCase: GetOrderUseCase,
    private readonly listOrdersUseCase: ListOrdersUseCase,
    private readonly confirmOrderUseCase: ConfirmOrderUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
  ) {}

  /**
   * POST /orders
   */
  async createOrder(body: CreateOrderInput): Promise<ApiResponse<any>> {
    try {
      const result = await this.createOrderUseCase.execute(body);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * GET /orders/:id
   */
  async getOrder(orderId: string): Promise<ApiResponse<any>> {
    try {
      const result = await this.getOrderUseCase.execute(orderId);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * GET /orders?customerId=xxx
   */
  async listOrders(customerId?: string): Promise<ApiResponse<any>> {
    try {
      const result = await this.listOrdersUseCase.execute(customerId);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * POST /orders/:id/confirm
   */
  async confirmOrder(orderId: string): Promise<ApiResponse<any>> {
    try {
      const result = await this.confirmOrderUseCase.execute(orderId);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * POST /orders/:id/cancel
   */
  async cancelOrder(orderId: string, reason: string): Promise<ApiResponse<any>> {
    try {
      const result = await this.cancelOrderUseCase.execute(orderId, reason);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
