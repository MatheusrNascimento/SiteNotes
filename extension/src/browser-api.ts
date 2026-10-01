// Firefox expoe `browser` (com Promises); Chrome expoe so `chrome`.
const globals = globalThis as { browser?: typeof chrome; chrome: typeof chrome };

export const api: typeof chrome = globals.browser ?? globals.chrome;
