import type { MembershipApp } from "./membership.js";
/**
 * Converte o catálogo estático (`./catalog`, sem rede) em `MembershipApp[]`
 * com papel `"USUARIO"` — pra um app renderizar o `AppSwitcher` mesmo se o
 * maranata-key estiver fora do ar, lento, ou sem `MARANATA_INTEGRATION_KEY`
 * configurada. É o mesmo comportamento das 3 cópias hardcoded de hoje
 * (rodizio-maranata, maranata-core), só que com as URLs canônicas do
 * catálogo em vez de valores fixos que podem apontar pra um `.vercel.app`
 * antigo.
 *
 * `currentSlug` é aceito por simetria com `AppSwitcher({ currentSlug })` —
 * hoje não filtra nem reordena a lista (o app atual aparece normalmente,
 * como nas cópias hardcoded existentes). Reservado pra uma futura
 * personalização por app (ex: esconder o próprio app da lista).
 */
export type CatalogFallbackMode = "catalog" | "current-only" | "none";
export type CatalogAsAppsOptions = {
    /**
     * `catalog` preserva o comportamento legado. Apps sensíveis ou abertos a
     * identidade externa devem usar `current-only` ou `none` para não anunciar
     * acesso que o Key não confirmou.
     */
    mode?: CatalogFallbackMode;
};
export declare function catalogAsApps(currentSlug?: string | null, options?: CatalogAsAppsOptions): MembershipApp[];
//# sourceMappingURL=fallback.d.ts.map