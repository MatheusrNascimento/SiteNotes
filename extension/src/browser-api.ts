// Firefox expoe `browser` (com Promises); Chrome expoe so `chrome`.
// Resolve na hora do acesso para testes poderem stubar `chrome` depois do import.
const globals = globalThis as { browser?: typeof chrome; chrome?: typeof chrome };

function resolveApi(): typeof chrome {
  const resolved = globals.browser ?? globals.chrome;
  if (!resolved) {
    throw new Error("Browser extension API is not available.");
  }
  return resolved;
}

export const api: typeof chrome = new Proxy({} as typeof chrome, {
  get(_target, prop) {
    const real = resolveApi();
    const value = Reflect.get(real, prop, real) as unknown;
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(real) : value;
  },
});
