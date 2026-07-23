import {
  CHART_API_VERSION,
  assertChartState,
  type ApiError,
  type ChartResultV1,
  type ChartStateV1,
  type EphemerisOperationRequestV1,
  type EphemerisOperationResponseV1,
  type JsonValue,
} from "@velatis/charts-contracts";

export * from "@velatis/charts-contracts";

const STATE_PARAMETER = "chart";

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJson(child)]),
    );
  }
  return value;
}

export function canonicalizeChartState(state: ChartStateV1): string {
  assertChartState(state);
  return JSON.stringify(sortJson(state));
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis
    .btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function fromBase64Url(value: string): string {
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = globalThis.atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeChartState(state: ChartStateV1): string {
  return toBase64Url(canonicalizeChartState(state));
}

export function decodeChartState(encoded: string): ChartStateV1 {
  if (encoded.length > 80_000)
    throw new TypeError("Encoded chart state is too large");
  const parsed: unknown = JSON.parse(fromBase64Url(encoded));
  assertChartState(parsed);
  return parsed;
}

export function buildShareUrl(baseUrl: string | URL, state: ChartStateV1): URL {
  const url = new URL(baseUrl);
  url.searchParams.set(STATE_PARAMETER, encodeChartState(state));
  return url;
}

export function readChartStateFromUrl(url: string | URL): ChartStateV1 | null {
  const encoded = new URL(url).searchParams.get(STATE_PARAMETER);
  return encoded ? decodeChartState(encoded) : null;
}

export function buildEmbedUrl(
  baseUrl: string | URL,
  state: ChartStateV1,
  options: { compact?: boolean; transparent?: boolean } = {},
): URL {
  const url = buildShareUrl(baseUrl, state);
  url.searchParams.set("embed", "1");
  if (options.compact) url.searchParams.set("compact", "1");
  if (options.transparent) url.searchParams.set("transparent", "1");
  return url;
}

export interface ChartsClientOptions {
  baseUrl: string | URL;
  fetch?: typeof globalThis.fetch;
  headers?: HeadersInit;
}

export class ChartsApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, response: ApiError) {
    super(response.error.message);
    this.name = "ChartsApiError";
    this.status = status;
    this.code = response.error.code;
  }
}

export class ChartsClient {
  readonly baseUrl: URL;
  readonly fetchImplementation: typeof globalThis.fetch;
  readonly headers: HeadersInit | undefined;

  constructor(options: ChartsClientOptions) {
    this.baseUrl = new URL(options.baseUrl);
    this.fetchImplementation =
      options.fetch ?? globalThis.fetch.bind(globalThis);
    this.headers = options.headers;
  }

  shareUrl(state: ChartStateV1): URL {
    return buildShareUrl(this.baseUrl, state);
  }

  embedUrl(
    state: ChartStateV1,
    options?: Parameters<typeof buildEmbedUrl>[2],
  ): URL {
    return buildEmbedUrl(this.baseUrl, state, options);
  }

  async calculate(
    state: ChartStateV1,
    signal?: AbortSignal,
  ): Promise<ChartResultV1> {
    const url = new URL(`/api/${CHART_API_VERSION}/charts`, this.baseUrl);
    const response = await this.fetchImplementation(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...this.headers },
      body: canonicalizeChartState(state),
      cache: "no-store",
      signal,
    });
    const body: unknown = await response.json();
    if (!response.ok)
      throw new ChartsApiError(response.status, body as ApiError);
    return body as ChartResultV1;
  }

  async ephemeris<T extends JsonValue = JsonValue>(
    operation: EphemerisOperationRequestV1["operation"],
    input: JsonValue,
    signal?: AbortSignal,
  ): Promise<T> {
    const url = new URL(`/api/${CHART_API_VERSION}/ephemeris`, this.baseUrl);
    const response = await this.fetchImplementation(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...this.headers },
      body: JSON.stringify({
        operation,
        input,
      } satisfies EphemerisOperationRequestV1),
      cache: "no-store",
      signal,
    });
    const body: unknown = await response.json();
    if (!response.ok)
      throw new ChartsApiError(response.status, body as ApiError);
    return (body as EphemerisOperationResponseV1).result as T;
  }
}
