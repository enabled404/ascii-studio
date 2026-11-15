declare module 'gifenc' {
  export interface GIFEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: { palette?: number[][]; delay?: number; transparent?: boolean; repeat?: number },
    ): void
    finish(): void
    bytes(): Uint8Array
    reset(): void
  }
  export function GIFEncoder(opts?: { auto?: boolean }): GIFEncoderInstance
  export function quantize(rgba: Uint8ClampedArray | number[], maxColors: number, opts?: unknown): number[][]
  export function applyPalette(rgba: Uint8ClampedArray | number[], palette: number[][], format?: string): Uint8Array
}
