import { describe, expect, it } from "vitest";
import {
  BRIDGE_PROTOCOL_VERSION,
  BRIDGE_SOURCE_APP,
  BRIDGE_SOURCE_EXTENSION,
  isAppRequest,
  isExtensionMessage,
} from "../../shared/bridge-protocol";

const appRequest = {
  source: BRIDGE_SOURCE_APP,
  version: BRIDGE_PROTOCOL_VERSION,
  type: "PING",
  requestId: "r1",
};

describe("isAppRequest", () => {
  it("aceita pedidos do app na versao atual", () => {
    expect(isAppRequest(appRequest)).toBe(true);
  });

  it.each([
    ["outra versao", { ...appRequest, version: BRIDGE_PROTOCOL_VERSION + 1 }],
    ["sem versao", { ...appRequest, version: undefined }],
    ["sem requestId", { ...appRequest, requestId: undefined }],
    ["fonte errada", { ...appRequest, source: BRIDGE_SOURCE_EXTENSION }],
    ["nao objeto", "PING"],
  ])("rejeita %s", (_, data) => {
    expect(isAppRequest(data)).toBe(false);
  });
});

describe("isExtensionMessage", () => {
  it("aceita mensagens da extensao na versao atual e rejeita outras versoes", () => {
    const ready = { source: BRIDGE_SOURCE_EXTENSION, version: BRIDGE_PROTOCOL_VERSION, type: "READY" };
    expect(isExtensionMessage(ready)).toBe(true);
    expect(isExtensionMessage({ ...ready, version: 0 })).toBe(false);
  });
});
