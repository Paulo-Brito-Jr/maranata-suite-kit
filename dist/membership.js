import { canonicalAppUrl } from "./catalog.js";
const DEFAULT_KEY_URL = "https://auth.maranata.app";
/**
 * Lê `process.env[name]` sem depender de `@types/node` (este pacote não
 * instala @types/node de propósito — ver README "Pendências conhecidas").
 * Acesso via `globalThis` com cast LOCAL (não é `declare global`), então não
 * declara um `process` ambiente que colidiria com o `@types/node` real de
 * quem consome este pacote. Roda em Node (onde `process` existe); em
 * runtimes sem `process` (Edge/browser) devolve `undefined` — fail-soft.
 */
function readEnv(name) {
    const proc = globalThis.process;
    return proc?.env?.[name];
}
const PAPEIS_VALIDOS = ["ADMIN", "USUARIO", "VIEWER"];
function isPapel(value) {
    return typeof value === "string" && PAPEIS_VALIDOS.includes(value);
}
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
export async function fetchMembershipApps(options) {
    const { email, integrationKey, source } = options;
    const timeoutMs = options.timeoutMs ?? 3_000;
    const keyUrl = (options.keyUrl ?? readEnv("MARANATA_KEY_AUTH_URL") ?? DEFAULT_KEY_URL).replace(/\/+$/, "");
    if (!email || !integrationKey)
        return null;
    try {
        const res = await fetch(`${keyUrl}/api/membership/${encodeURIComponent(email)}`, {
            headers: {
                Authorization: `Bearer ${integrationKey}`,
                "x-source": source,
            },
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok)
            return null;
        const body = (await res.json());
        if (!Array.isArray(body.apps))
            return null;
        const apps = [];
        for (const raw of body.apps) {
            if (typeof raw.slug !== "string" || typeof raw.nome !== "string" || !isPapel(raw.papel)) {
                continue;
            }
            const rawUrl = typeof raw.url === "string" ? raw.url : null;
            const url = canonicalAppUrl(raw.slug, rawUrl);
            if (!url)
                continue;
            apps.push({
                slug: raw.slug,
                nome: raw.nome,
                url,
                papel: raw.papel,
                via: raw.via === "group" ? "group" : "direct",
            });
        }
        return apps;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=membership.js.map