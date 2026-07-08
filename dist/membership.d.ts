/**
 * Payload de membership do maranata-key.
 * Espelha `EffectiveApp` de
 * /Users/paulobrito/dev/maranata-key/src/lib/membership.ts
 */
export type Papel = "ADMIN" | "USUARIO" | "VIEWER";
export type MembershipApp = {
    slug: string;
    nome: string;
    url: string;
    papel: Papel;
    via: "direct" | "group";
};
export type FetchMembershipAppsOptions = {
    /** E-mail do membro (mesma chave usada como identidade no maranata-key). */
    email: string;
    /**
     * Base URL do maranata-key. Default: `process.env.MARANATA_KEY_AUTH_URL`,
     * caindo pra "https://auth.maranata.app". A env antiga `MARANATA_KEY_URL`
     * (usada em cópias hardcoded anteriores) foi descontinuada por design —
     * padronizamos em `MARANATA_KEY_AUTH_URL` e ela NÃO tem efeito aqui.
     */
    keyUrl?: string;
    /** `MARANATA_INTEGRATION_KEY` compartilhada entre os apps da Suite. */
    integrationKey: string;
    /** Header `x-source` — identifica o app chamador (ex: "rodizio"). */
    source: string;
    /** Timeout da chamada em ms. Default 3000. */
    timeoutMs?: number;
};
/**
 * Busca os apps efetivos de um membro no maranata-key (fonte de identidade
 * da Suite Maranata — GET /api/membership/{email}).
 *
 * Server-to-server: `Authorization: Bearer <integrationKey>` + `x-source`,
 * seguindo o padrão fail-soft já usado em
 * /Users/paulobrito/dev/maranata-core/lib/suite-clients.ts — timeout curto,
 * NUNCA lança. Qualquer falha (rede, timeout, resposta não-ok, corpo
 * inesperado) retorna `null`; quem chama decide o fallback
 * (ver `./fallback` → `catalogAsApps`).
 *
 * Cada app retornado passa por `canonicalAppUrl()` (`./catalog`), então a
 * URL nunca é um `.vercel.app` esquecido em banco — é sempre a canônica
 * `*.maranata.app` quando o slug é conhecido.
 */
export declare function fetchMembershipApps(options: FetchMembershipAppsOptions): Promise<MembershipApp[] | null>;
//# sourceMappingURL=membership.d.ts.map