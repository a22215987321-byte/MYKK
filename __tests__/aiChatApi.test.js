import handler, { freeLlmChatUrl } from "../pages/api/ai/chat";

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("AI chat FreeLLMAPI provider", () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.FREELLMAPI_BASE_URL;
    delete process.env.FREELLMAPI_API_KEY;
    delete process.env.FREELLMAPI_MODEL;
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  test.each([
    ["https://router.example.com", "https://router.example.com/v1/chat/completions"],
    ["https://router.example.com/v1/", "https://router.example.com/v1/chat/completions"],
    ["https://router.example.com/v1/chat/completions", "https://router.example.com/v1/chat/completions"],
  ])("normalizes %s", (input, expected) => {
    expect(freeLlmChatUrl(input)).toBe(expected);
  });

  it("reports FreeLLMAPI availability without exposing credentials", async () => {
    process.env.FREELLMAPI_BASE_URL = "https://router.example.com/v1";
    const disabled = createResponse();
    await handler({ method: "GET" }, disabled);
    expect(disabled.body).toEqual({ freellmapiEnabled: false });

    process.env.FREELLMAPI_API_KEY = "freellmapi-test-key";
    const enabled = createResponse();
    await handler({ method: "GET" }, enabled);
    expect(enabled.body).toEqual({ freellmapiEnabled: true });
    expect(JSON.stringify(enabled.body)).not.toContain("freellmapi-test-key");
  });

  it("fails clearly without a configured endpoint", async () => {
    const res = createResponse();
    await handler({ method: "POST", body: { model: "freellm-auto", messages: [{ role: "user", content: "hello" }] } }, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/endpoint/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sends an OpenAI-compatible request through FreeLLMAPI", async () => {
    process.env.FREELLMAPI_BASE_URL = "https://router.example.com/v1";
    process.env.FREELLMAPI_API_KEY = "freellmapi-test-key";
    process.env.FREELLMAPI_MODEL = "auto:smart";
    global.fetch.mockResolvedValue({
      ok: true,
      headers: { get: name => name.toLowerCase() === "x-routed-via" ? "groq/example-model" : null },
      json: async () => ({ choices: [{ message: { content: "response" } }] }),
    });
    const res = createResponse();

    await handler({ method: "POST", body: { model: "freellm-auto", messages: [{ role: "user", content: "hello" }] } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ reply: "response", provider: "freellmapi", routedVia: "groq/example-model" }));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, request] = global.fetch.mock.calls[0];
    expect(url).toBe("https://router.example.com/v1/chat/completions");
    expect(request.headers.Authorization).toBe("Bearer freellmapi-test-key");
    expect(JSON.parse(request.body)).toEqual(expect.objectContaining({ model: "auto:smart", stream: false }));
  });
});
