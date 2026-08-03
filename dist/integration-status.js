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
const DIRECTIONS = [
    "inbound",
    "outbound",
    "both",
];
const STATES = [
    "ok",
    "warn",
    "error",
    "idle",
    "unknown",
];
function optionalString(value) {
    return typeof value === "string" && value.trim() ? value : null;
}
function optionalCount(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0
        ? Math.floor(value)
        : null;
}
function parseEntry(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        return null;
    const entry = raw;
    const key = optionalString(entry.key);
    const counterpart = optionalString(entry.counterpart);
    if (!key || !counterpart)
        return null;
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(key))
        return null;
    const direction = DIRECTIONS.includes(entry.direction)
        ? entry.direction
        : "both";
    const state = STATES.includes(entry.state)
        ? entry.state
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
export function parseIntegrationStatus(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        return null;
    const body = raw;
    if (body.schemaVersion !== INTEGRATION_STATUS_SCHEMA_VERSION)
        return null;
    const app = optionalString(body.app);
    const generatedAt = optionalString(body.generatedAt);
    if (!app || !generatedAt || !Array.isArray(body.integrations))
        return null;
    return {
        schemaVersion: INTEGRATION_STATUS_SCHEMA_VERSION,
        app,
        generatedAt,
        integrations: body.integrations
            .map(parseEntry)
            .filter((entry) => entry !== null),
    };
}
/** Açúcar para os provedores montarem a resposta com a versão correta. */
export function buildIntegrationStatus(app, integrations) {
    return {
        schemaVersion: INTEGRATION_STATUS_SCHEMA_VERSION,
        app,
        generatedAt: new Date().toISOString(),
        integrations,
    };
}
//# sourceMappingURL=integration-status.js.map