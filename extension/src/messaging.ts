import { api } from "./browser-api";

/** Envia ao background e resolve com a resposta do listener (`undefined` se ninguem respondeu). */
export function sendRuntimeMessage<T>(message: object): Promise<T | undefined> {
  const result = api.runtime.sendMessage(message) as Promise<T> | undefined;
  if (result && typeof result.then === "function") {
    return result;
  }

  return new Promise((resolve, reject) => {
    api.runtime.sendMessage(message, (response: T) => {
      const err = api.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }

      resolve(response);
    });
  });
}
