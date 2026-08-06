import { MARANATA_SUITE_CATALOG } from "./catalog.js";
export function catalogAsApps(currentSlug, options = {}) {
    const mode = options.mode ?? "catalog";
    if (mode === "none")
        return [];
    return Object.values(MARANATA_SUITE_CATALOG)
        .filter((entry) => mode === "catalog" || entry.slug === currentSlug)
        .map((entry) => ({
        slug: entry.slug,
        nome: entry.nome,
        url: entry.url,
        papel: mode === "current-only" ? "ACESSO" : "USUARIO",
        via: "direct",
    }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
}
//# sourceMappingURL=fallback.js.map