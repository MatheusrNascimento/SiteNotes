import { afterEach, describe, expect, it, vi } from "vitest";

async function loadMessaging(runtime: object) {
  vi.resetModules();
  vi.stubGlobal("chrome", { runtime });
  return import("../src/messaging");
}

describe("sendRuntimeMessage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devolve a promise do runtime quando ela existe", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ tabs: [] });
    const { sendRuntimeMessage } = await loadMessaging({ sendMessage });

    await expect(sendRuntimeMessage({ type: "GET_OPEN_TABS" })).resolves.toEqual({ tabs: [] });
    expect(sendMessage).toHaveBeenCalledWith({ type: "GET_OPEN_TABS" });
  });

  it("rejeita com o lastError do callback", async () => {
    const runtime = {
      lastError: undefined as { message: string } | undefined,
      sendMessage: vi.fn((_message: object, callback?: (response: unknown) => void) => {
        if (callback) {
          runtime.lastError = { message: "sem receptor" };
          callback(undefined);
        }
        return undefined;
      }),
    };
    const { sendRuntimeMessage } = await loadMessaging(runtime);

    await expect(sendRuntimeMessage({ type: "PING" })).rejects.toThrow("sem receptor");
  });
});
