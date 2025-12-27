declare module "node:test" {
  const test: (name: string, fn: () => void | Promise<void>) => void
  export default test
}

declare module "node:assert/strict" {
  const assert: {
    equal: (actual: unknown, expected: unknown, message?: string) => void
    ok: (value: unknown, message?: string) => void
  }
  export default assert
}

declare module "node:fs/promises" {
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>
  export function writeFile(
    file: string,
    data: Uint8Array | ArrayBuffer,
    options?: { encoding?: string }
  ): Promise<void>
}

declare module "node:path" {
  const path: {
    join: (...parts: string[]) => string
    resolve: (...parts: string[]) => string
  }
  export default path
}
