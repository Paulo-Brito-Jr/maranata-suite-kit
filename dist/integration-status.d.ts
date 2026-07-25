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
export declare const INTEGRATION_STATUS_SCHEMA_VERSION = "integration-status.v1";
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
/**
 * Valida/normaliza um payload cru. Fail-soft no espírito do resto do kit:
 * shape inesperado → null; entradas individuais inválidas são descartadas.
 */
export declare function parseIntegrationStatus(raw: unknown): IntegrationStatusV1 | null;
/** Açúcar para os provedores montarem a resposta com a versão correta. */
export declare function buildIntegrationStatus(app: string, integrations: IntegrationEntry[]): IntegrationStatusV1;
//# sourceMappingURL=integration-status.d.ts.map