// ============================================================
// Driven Adapter - UUID 產生器
// ============================================================
// IdGenerator Output Port 的具體實作。
// 遵循 DIP：應用層不知道 ID 是用 UUID 產生的。
// ============================================================

import { IdGenerator } from '../../application/ports/output/IdGenerator';

export class UuidGenerator implements IdGenerator {
  generate(): string {
    return crypto.randomUUID();
  }
}

/**
 * 測試用的固定 ID 產生器
 * 遵循 LSP：可完全替代 UuidGenerator
 */
export class FixedIdGenerator implements IdGenerator {
  private ids: string[];
  private index = 0;

  constructor(...ids: string[]) {
    this.ids = ids.length > 0 ? ids : ['test-id-1'];
  }

  generate(): string {
    const id = this.ids[this.index % this.ids.length];
    this.index++;
    return id;
  }
}
