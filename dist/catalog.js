/**
 * Catálogo canônico de apps da Suite Maranata.
 *
 * SNAPSHOT — a fonte de verdade é o maranata-key:
 *   /Users/paulobrito/dev/maranata-key/src/lib/maranata-suite.ts (MARANATA_SUITE_APPS)
 *
 * Qualquer app novo da Suite entra PRIMEIRO lá; este pacote é um espelho
 * read-only, só com os campos que o app-switcher e o fallback precisam
 * (slug/nome/url/icon/cor). Campos omitidos de propósito porque são
 * específicos do fluxo de SSO do maranata-key e não servem a este pacote:
 * `descricao`, `allowedOrigins`, `allowedReturnPaths`.
 *
 * Ao adicionar/mudar um app no maranata-key, resincronize esta tabela
 * manualmente (copiar os 5 campos) e suba um patch novo deste pacote.
 */
export const MARANATA_SUITE_CATALOG = {
    acampamento: {
        slug: "acampamento",
        nome: "Acampamento Maranata",
        url: "https://acampamento.maranata.app",
        icon: "⛺",
        cor: "#f97316",
    },
    rodizio: {
        slug: "rodizio",
        nome: "Rodízio Maranata",
        url: "https://rodizio.maranata.app",
        icon: "🔁",
        cor: "#ff6e32",
    },
    escala: {
        slug: "escala",
        nome: "Maranata Escala",
        url: "https://escala.maranata.app",
        icon: "🗓️",
        cor: "#163970",
    },
    agenda: {
        slug: "agenda",
        nome: "Agenda Maranata",
        url: "https://agenda.maranata.app",
        icon: "📅",
        cor: "#ff6e32",
    },
    pastoral: {
        slug: "pastoral",
        nome: "Cuidado Pastoral",
        url: "https://pastoral.maranata.app",
        icon: "🐑",
        cor: "#0d9488",
    },
    core: {
        slug: "core",
        nome: "Maranata Core",
        url: "https://core.maranata.app",
        icon: "🧭",
        cor: "#163970",
    },
    "festa-amor": {
        slug: "festa-amor",
        nome: "Festa do Amor",
        url: "https://festa-amor.maranata.app",
        icon: "🎉",
        cor: "#ff6e32",
    },
    financeiro: {
        slug: "financeiro",
        nome: "Financeiro Maranata",
        url: "https://financeiro.maranata.app",
        icon: "💰",
        cor: "#10b981",
    },
    "maranata-app": {
        slug: "maranata-app",
        nome: "Maranata App",
        url: "https://maranata.app",
        icon: "📱",
        cor: "#F0641E",
    },
    ministerio: {
        slug: "ministerio",
        nome: "Ministério Maranata",
        url: "https://ministerio.maranata.app",
        icon: "🏛️",
        cor: "#163970",
    },
    igreja: {
        slug: "igreja",
        nome: "Igreja Maranata",
        url: "https://igreja.maranata.app",
        icon: "⛪",
        cor: "#15966A",
    },
    sistema: {
        slug: "sistema",
        nome: "Sistema Maranata",
        url: "https://sistema.maranata.app",
        icon: "🛰️",
        cor: "#475569",
    },
    tutorial: {
        slug: "tutorial",
        nome: "Tutoriais Maranata",
        url: "https://tutorial.maranata.app",
        icon: "📖",
        cor: "#163970",
    },
    ensino: {
        slug: "ensino",
        nome: "Ensino Maranata",
        url: "https://ensino.maranata.app",
        icon: "🎓",
        cor: "#163970",
    },
    ibm: {
        slug: "ibm",
        nome: "Instituto Bíblico Maranata",
        url: "https://ibm.maranata.app",
        icon: "📚",
        cor: "#163970",
    },
    ebd: {
        slug: "ebd",
        nome: "EBD Maranata",
        url: "https://ebd.maranata.app",
        icon: "✝️",
        cor: "#163970",
    },
    // O Key não tem entrada no MARANATA_SUITE_APPS (é o emissor do SSO, não um
    // consumidor) — entra aqui direto pro observatório/switcher enxergarem o
    // app mais crítico da suite.
    key: {
        slug: "key",
        nome: "Maranata Key",
        url: "https://key.maranata.app",
        icon: "🔑",
        cor: "#f97316",
    },
    // InChurch é o painel de auditoria (não-Maranata, fica em britos.app por
    // decisão) — mantido aqui pra não regredir o comportamento hardcoded atual.
    "inchurch-dashboard": {
        slug: "inchurch-dashboard",
        nome: "InChurch (auditoria)",
        url: "https://inchurch.britos.app",
        icon: "📊",
        cor: "#163970",
    },
    "360": {
        slug: "360",
        nome: "Maranata 360",
        url: "https://360.maranata.app",
        icon: "🕊️",
        cor: "#ff6e32",
    },
};
/**
 * Resolve a URL canônica de um app pelo slug. SEMPRE prefere o catálogo
 * local (mata URL velha/preview `.vercel.app` que possa ter ficado presa
 * em algum registro de banco). Só usa `fallbackUrl` quando o slug é
 * desconhecido do catálogo (app novo que ainda não foi sincronizado aqui).
 */
export function canonicalAppUrl(slug, fallbackUrl) {
    const known = MARANATA_SUITE_CATALOG[slug];
    if (known)
        return known.url;
    return fallbackUrl?.trim() || null;
}
//# sourceMappingURL=catalog.js.map