/**
 * Cliente canônico do Maranata Core — fonte de verdade pra Church/Pastor/User
 * da Suite Maranata (L99 Onda 3: fim das 5 cópias de lib/integrations/maranata-core.ts).
 *
 * Os tipos abaixo são FIÉIS às respostas reais das rotas do maranata-core
 * (app/api/{igrejas,pastores,pastores-gerais,users}) — não a espelhos locais.
 * Doc canônico: maranata-core/docs/CONCEITOS-SUITE.md
 */
const DEFAULT_CORE_URL = "https://maranata-core.vercel.app";
function readEnv(name) {
    const proc = globalThis
        .process;
    return proc?.env?.[name];
}
export function createCoreClient(options) {
    const source = options.source;
    const revalidate = options.revalidate ?? 600;
    function baseUrl() {
        return (options.baseUrl ?? readEnv("MARANATA_CORE_URL") ?? DEFAULT_CORE_URL).replace(/\/+$/, "");
    }
    function baseHeaders() {
        const key = options.integrationKey ?? readEnv("MARANATA_INTEGRATION_KEY");
        if (!key)
            return null;
        return { Authorization: `Bearer ${key}`, "x-source": source };
    }
    async function getJson(path, tags) {
        const headers = baseHeaders();
        if (!headers)
            return null;
        try {
            const init = {
                headers,
                next: { revalidate, tags: tags ?? [`core:${path}`] },
            };
            const res = await fetch(`${baseUrl()}${path}`, init);
            if (!res.ok) {
                console.warn(`[maranata-core] ${path} → ${res.status}`);
                return null;
            }
            return (await res.json());
        }
        catch (err) {
            console.warn(`[maranata-core] ${path} falhou:`, err);
            return null;
        }
    }
    async function mutate(method, path, body) {
        const headers = baseHeaders();
        if (!headers)
            return { ok: false, error: "Core não configurado" };
        try {
            const res = await fetch(`${baseUrl()}${path}`, {
                method,
                headers: { ...headers, "content-type": "application/json" },
                body: body ? JSON.stringify(body) : undefined,
                cache: "no-store",
            });
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                return { ok: false, error: `${method} ${path} → ${res.status} ${text}` };
            }
            if (res.status === 204)
                return { ok: true, data: undefined };
            const data = (await res.json());
            return { ok: true, data };
        }
        catch (err) {
            return { ok: false, error: err instanceof Error ? err.message : "fetch falhou" };
        }
    }
    /**
     * Lista churches do core (shape cru da API). Sem filtro retorna todas as 16
     * (14 congregações + Sede + Acampamento).
     */
    async function listChurches(opts = {}) {
        const qs = new URLSearchParams();
        if (opts.type)
            qs.set("type", opts.type);
        if (opts.types && opts.types.length > 0)
            qs.set("types", opts.types.join(","));
        const suffix = qs.toString() ? `?${qs}` : "";
        const tag = opts.type ? `core:churches:${opts.type}` : "core:churches";
        return getJson(`/api/igrejas${suffix}`, [tag]);
    }
    /** Atalho: só as 14 congregações. */
    async function listCongregacoes() {
        return listChurches({ type: "CONGREGATION" });
    }
    /** Lista pastores gerais de ministério (transversais às unidades). */
    async function listPastoresGerais(opts = {}) {
        const qs = new URLSearchParams();
        if (opts.area)
            qs.set("area", opts.area);
        if (opts.userId)
            qs.set("userId", opts.userId);
        const suffix = qs.toString() ? `?${qs}` : "";
        return getJson(`/api/pastores-gerais${suffix}`, ["core:pastores-gerais"]);
    }
    /** A rota /api/igrejas/[id|slug|name] retorna o objeto direto. */
    async function getChurch(idOrSlugOrName) {
        return getJson(`/api/igrejas/${encodeURIComponent(idOrSlugOrName)}`, [`core:church:${idOrSlugOrName}`]);
    }
    async function listPastores(opts = {}) {
        const qs = new URLSearchParams();
        if (opts.church)
            qs.set("church", opts.church);
        if (opts.role)
            qs.set("role", opts.role);
        const suffix = qs.toString() ? `?${qs}` : "";
        return getJson(`/api/pastores${suffix}`, ["core:pastores"]);
    }
    async function getPastor(idOrEmail) {
        return getJson(`/api/pastores/${encodeURIComponent(idOrEmail)}`, [`core:pastor:${idOrEmail}`]);
    }
    async function getUserByEmail(email) {
        return getJson(`/api/users/${encodeURIComponent(email)}`, [`core:user:${email}`]);
    }
    async function listUsers(opts = {}) {
        const qs = new URLSearchParams();
        if (opts.email)
            qs.set("email", opts.email);
        const suffix = qs.toString() ? `?${qs}` : "";
        return getJson(`/api/users${suffix}`, ["core:users"]);
    }
    // ── Mutations (write-through pro core) ──────────────────────────────────
    async function createChurchInCore(input) {
        return mutate("POST", "/api/igrejas", input);
    }
    async function updateChurchInCore(id, patch) {
        return mutate("PATCH", `/api/igrejas/${encodeURIComponent(id)}`, patch);
    }
    async function archiveChurchInCore(id) {
        return mutate("DELETE", `/api/igrejas/${encodeURIComponent(id)}`);
    }
    async function createPastorInCore(input) {
        return mutate("POST", "/api/pastores", input);
    }
    async function updatePastorInCore(id, patch) {
        return mutate("PATCH", `/api/pastores/${encodeURIComponent(id)}`, patch);
    }
    async function archivePastorInCore(id) {
        return mutate("DELETE", `/api/pastores/${encodeURIComponent(id)}`);
    }
    async function createUserInCore(input) {
        return mutate("POST", "/api/users", input);
    }
    async function updateUserInCore(emailOrId, patch) {
        return mutate("PATCH", `/api/users/${encodeURIComponent(emailOrId)}`, patch);
    }
    async function revokeUserInCore(emailOrId) {
        return mutate("DELETE", `/api/users/${encodeURIComponent(emailOrId)}`);
    }
    async function coreStatus() {
        const igrejas = await listChurches();
        if (!igrejas)
            return { ok: false, igrejas: 0, pastores: 0, users: 0 };
        const pastores = await listPastores();
        return {
            ok: true,
            igrejas: igrejas.total,
            pastores: pastores?.total ?? 0,
            users: 0, // não exposto sem filtro pra evitar dump
        };
    }
    /**
     * Reporta uma mutação relevante no AuditLog centralizado do Core.
     * Fire-and-forget — nunca bloqueia o caller.
     * Doc: maranata-core/docs/AUDIT-CROSS-APP.md
     */
    async function reportAudit(input) {
        const headers = baseHeaders();
        if (!headers)
            return;
        try {
            await fetch(`${baseUrl()}/api/audit`, {
                method: "POST",
                headers: { ...headers, "content-type": "application/json" },
                body: JSON.stringify(input),
                cache: "no-store",
            });
        }
        catch {
            // não-fatal — audit é best-effort
        }
    }
    return {
        listChurches,
        listCongregacoes,
        listPastoresGerais,
        getChurch,
        listPastores,
        getPastor,
        getUserByEmail,
        listUsers,
        createChurchInCore,
        updateChurchInCore,
        archiveChurchInCore,
        createPastorInCore,
        updatePastorInCore,
        archivePastorInCore,
        createUserInCore,
        updateUserInCore,
        revokeUserInCore,
        coreStatus,
        reportAudit,
    };
}
//# sourceMappingURL=core.js.map