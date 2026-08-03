/**
 * Contrato `integration-status.v1` — telemetria de integração que cada app
 * da Suite expõe em `/api/internal/v1/integration-status` para o observatório
 * (sistema.maranata.app).
 *
 * Server-to-server: o consumidor autentica com a credencial de integração
 * que o app provedor já usa para consumidores (Bearer + `x-source: sistema`).
 * O contrato é deliberadamente pequeno: estado agregado por integração,
 * nunca payloads de dados.
 */

export const INTEGRATION_STATUS_SCHEMA_VERSION = "integration-status.v1";

export type IntegrationDirection = "inbound" | "outbound" | "both";

export type IntegrationState = "ok" | "warn" | "error" | "idle" | "unknown";

export type IntegrationEntry = {
  /** Identificador estável da integração dentro do app (ex: "core-sync"). */
  key: string;
  /** Slug do app do outro lado (ou "core"/"key" para os canônicos). */
  counterpart: string;
  direction: IntegrationDirection;
  state: IntegrationState;
  /** Última execução observada (ISO), se houver registro. */
  lastRunAt: string | null;
  /** Última execução bem-sucedida (ISO), se houver registro. */
  lastOkAt: string | null;
  /** Versão de contrato usada pela integração, quando aplicável. */
  contractVersion?: string | null;
  /** Execuções/falhas nas últimas 24h, quando o app mantém contadores. */
  runsLast24h?: number | null;
  failuresLast24h?: number | null;
  /** Detalhe curto e legível (nunca stack trace nem dado sensível). */
  detail?: string | null;
};

export type IntegrationStatusV1 = {
  schemaVersion: typeof INTEGRATION_STATUS_SCHEMA_VERSION;
  app: string;
  generatedAt: string;
  integrations: IntegrationEntry[];
};

const DIRECTIONS: readonly IntegrationDirection[] = [
  "inbound",
  "outbound",
  "both",
];
const STATES: readonly IntegrationState[] = [
  "ok",
  "warn",
  "error",
  "idle",
  "unknown",
];

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function optionalCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null;
}

function parseEntry(raw: unknown): IntegrationEntry | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const entry = raw as Record<string, unknown>;

  const key = optionalString(entry.key);
  const counterpart = optionalString(entry.counterpart);
  if (!key || !counterpart) return null;
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(key)) return null;

  const direction = DIRECTIONS.includes(entry.direction as IntegrationDirection)
    ? (entry.direction as IntegrationDirection)
    : "both";
  const state = STATES.includes(entry.state as IntegrationState)
    ? (entry.state as IntegrationState)
    : "unknown";

  return {
    key,
    counterpart,
    direction,
    state,
    lastRunAt: optionalString(entry.lastRunAt),
    lastOkAt: optionalString(entry.lastOkAt),
    contractVersion: optionalString(entry.contractVersion),
    runsLast24h: optionalCount(entry.runsLast24h),
    failuresLast24h: optionalCount(entry.failuresLast24h),
    detail: optionalString(entry.detail)?.slice(0, 280) ?? null,
  };
}

/**
 * Valida/normaliza um payload cru. Fail-soft no espírito do resto do kit:
 * shape inesperado → null; entradas individuais inválidas são descartadas.
 */
export function parseIntegrationStatus(
  raw: unknown,
): IntegrationStatusV1 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const body = raw as Record<string, unknown>;

  if (body.schemaVersion !== INTEGRATION_STATUS_SCHEMA_VERSION) return null;
  const app = optionalString(body.app);
  const generatedAt = optionalString(body.generatedAt);
  if (!app || !generatedAt || !Array.isArray(body.integrations)) return null;

  return {
    schemaVersion: INTEGRATION_STATUS_SCHEMA_VERSION,
    app,
    generatedAt,
    integrations: body.integrations
      .map(parseEntry)
      .filter((entry): entry is IntegrationEntry => entry !== null),
  };
}

/** Açúcar para os provedores montarem a resposta com a versão correta. */
export function buildIntegrationStatus(
  app: string,
  integrations: IntegrationEntry[],
): IntegrationStatusV1 {
  return {
    schemaVersion: INTEGRATION_STATUS_SCHEMA_VERSION,
    app,
    generatedAt: new Date().toISOString(),
    integrations,
  };
}
