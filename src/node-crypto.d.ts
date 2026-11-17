declare module "node:crypto" {
  export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean;
  export function createHash(algorithm: string): {
    update(data: string, encoding?: string): { digest(): Uint8Array };
  };
}
