import { MARANATA_SUITE_CATALOG } from "./catalog.js";
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
export function catalogAsApps(currentSlug) {
    void currentSlug;
    return Object.values(MARANATA_SUITE_CATALOG)
        .map((entry) => ({
        slug: entry.slug,
        nome: entry.nome,
        url: entry.url,
        papel: "USUARIO",
        via: "direct",
    }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
}
//# sourceMappingURL=fallback.js.map