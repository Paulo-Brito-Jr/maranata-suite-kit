/**
 * Cliente canônico do Maranata Core — fonte de verdade pra Church/Pastor/User
 * da Suite Maranata (L99 Onda 3: fim das 5 cópias de lib/integrations/maranata-core.ts).
 *
 * Os tipos abaixo são FIÉIS às respostas reais das rotas do maranata-core
 * (app/api/{igrejas,pastores,pastores-gerais,users}) — não a espelhos locais.
 * Doc canônico: maranata-core/docs/CONCEITOS-SUITE.md
 */

/**
 * Tipo canônico da Church na Suite:
 * - CONGREGATION: as 14 unidades locais
 * - HEADQUARTERS: Sede administrativa
 * - CAMP: Acampamento Maranata (sítio)
 */
export type ChurchType = "CONGREGATION" | "HEADQUARTERS" | "CAMP";

export type CoreChurch = {
  id: string;
  slug: string;
  name: string;
  type: ChurchType;
  city: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  lat: number | null;
  lng: number | null;
  memberCount: number | null;
  visible: boolean;
  pastoresCount: number;
  updatedAt: string;
};

export type CoreMinistryArea =
  | "KIDS"
  | "TEEN"
  | "JOVENS"
  | "CASAIS"
  | "TERCEIRA_IDADE"
  | "LOUVOR";

export type CoreGeneralMinistryPastor = {
  id: string;
  ministry: CoreMinistryArea;
  user: { id: string; email: string; name: string | null; churchId: string | null };
  notes: string | null;
  createdAt: string;
};

export type CorePastor = {
  id: string;
  name: string;
  role: string;
  /**
   * Funções pastorais aditivas (SENIOR/PRESIDENTE/ADMINISTRATIVO, ...) —
   * acumulam sobre `role`. Opcional: o Core pode ainda não retornar este
   * campo durante o rollout (ver `@paulo-brito-jr/maranata-suite-kit/pastoral`).
   */
  funcoes?: string[];
  isFullTime: boolean;
  onLeave: boolean;
  /**
   * Lifecycle do ministro no Core: "ATIVO" | "SAIU" (deixou o ministério —
   * tombstone preservado). O GET default do Core só devolve ATIVO; espelhos
   * que propagam a saída pedem `listPastores({ includeInactive: true })`.
   * Opcional: o Core pode ainda não retornar o campo durante o rollout.
   */
  status?: string;
  saidaEm?: string | null;
  saidaMotivo?: string | null;
  email: string | null;
  phone: string | null;
  birthday?: string | null;
  ordination?: string | null;
  spouseName?: string | null;
  spouseBday?: string | null;
  spousePhone?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  notes?: string | null;
  church: { id: string; slug: string; name: string } | null;
};

export type CoreUser = {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  churchId: string | null;
  pastorId: string | null;
  emailVerified?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CoreClientOptions = {
  /** Identificação do app chamador — vira o header `x-source` (ex: "rodizio"). */
  source: string;
  /** Default: env MARANATA_CORE_URL, senão https://maranata-core.vercel.app */
  baseUrl?: string;
  /** Default: env MARANATA_INTEGRATION_KEY */
  integrationKey?: string;
  /** Cache dos GETs (Next fetch revalidate, segundos). Default: 600. */
  revalidate?: number;
};

export type CoreMutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const DEFAULT_CORE_URL = "https://maranata-core.vercel.app";

function readEnv(name: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process;
  return proc?.env?.[name];
}

/** RequestInit estendido com as opções de cache do Next (ignoradas fora dele). */
type NextFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

export function createCoreClient(options: CoreClientOptions) {
  const source = options.source;
  const revalidate = options.revalidate ?? 600;

  function baseUrl(): string {
    return (options.baseUrl ?? readEnv("MARANATA_CORE_URL") ?? DEFAULT_CORE_URL).replace(
      /\/+$/,
      "",
    );
  }

  function baseHeaders(): Record<string, string> | null {
    const key = options.integrationKey ?? readEnv("MARANATA_INTEGRATION_KEY");
    if (!key) return null;
    return { Authorization: `Bearer ${key}`, "x-source": source };
  }

  async function getJson<T>(path: string, tags?: string[]): Promise<T | null> {
    const headers = baseHeaders();
    if (!headers) return null;
    try {
      const init: NextFetchInit = {
        headers,
        next: { revalidate, tags: tags ?? [`core:${path}`] },
      };
      const res = await fetch(`${baseUrl()}${path}`, init);
      if (!res.ok) {
        console.warn(`[maranata-core] ${path} → ${res.status}`);
        return null;
      }
      return (await res.json()) as T;
    } catch (err) {
      console.warn(`[maranata-core] ${path} falhou:`, err);
      return null;
    }
  }

  async function mutate<T>(
    method: "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<CoreMutationResult<T>> {
    const headers = baseHeaders();
    if (!headers) return { ok: false, error: "Core não configurado" };
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
      if (res.status === 204) return { ok: true, data: undefined as T };
      const data = (await res.json()) as T;
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "fetch falhou" };
    }
  }

  /**
   * Lista churches do core (shape cru da API). Sem filtro retorna todas as 16
   * (14 congregações + Sede + Acampamento).
   */
  async function listChurches(
    opts: { type?: ChurchType; types?: ChurchType[] } = {},
  ): Promise<{ total: number; churches: CoreChurch[] } | null> {
    const qs = new URLSearchParams();
    if (opts.type) qs.set("type", opts.type);
    if (opts.types && opts.types.length > 0) qs.set("types", opts.types.join(","));
    const suffix = qs.toString() ? `?${qs}` : "";
    const tag = opts.type ? `core:churches:${opts.type}` : "core:churches";
    return getJson(`/api/igrejas${suffix}`, [tag]);
  }

  /** Atalho: só as 14 congregações. */
  async function listCongregacoes(): Promise<{
    total: number;
    churches: CoreChurch[];
  } | null> {
    return listChurches({ type: "CONGREGATION" });
  }

  /** Lista pastores gerais de ministério (transversais às unidades). */
  async function listPastoresGerais(
    opts: { area?: CoreMinistryArea; userId?: string } = {},
  ): Promise<{ total: number; pastores: CoreGeneralMinistryPastor[] } | null> {
    const qs = new URLSearchParams();
    if (opts.area) qs.set("area", opts.area);
    if (opts.userId) qs.set("userId", opts.userId);
    const suffix = qs.toString() ? `?${qs}` : "";
    return getJson(`/api/pastores-gerais${suffix}`, ["core:pastores-gerais"]);
  }

  /** A rota /api/igrejas/[id|slug|name] retorna o objeto direto. */
  async function getChurch(idOrSlugOrName: string): Promise<CoreChurch | null> {
    return getJson<CoreChurch>(
      `/api/igrejas/${encodeURIComponent(idOrSlugOrName)}`,
      [`core:church:${idOrSlugOrName}`],
    );
  }

  async function listPastores(
    opts: { church?: string; role?: string; includeInactive?: boolean } = {},
  ): Promise<{ total: number; pastores: CorePastor[] } | null> {
    const qs = new URLSearchParams();
    if (opts.church) qs.set("church", opts.church);
    if (opts.role) qs.set("role", opts.role);
    // Inclui quem tem status SAIU (tombstone) — só pra espelhos/sync que
    // precisam propagar a saída; telas normais usam o default (só ATIVO).
    if (opts.includeInactive) qs.set("incluirInativos", "true");
    const suffix = qs.toString() ? `?${qs}` : "";
    return getJson(`/api/pastores${suffix}`, ["core:pastores"]);
  }

  async function getPastor(idOrEmail: string): Promise<CorePastor | null> {
    return getJson<CorePastor>(
      `/api/pastores/${encodeURIComponent(idOrEmail)}`,
      [`core:pastor:${idOrEmail}`],
    );
  }

  async function getUserByEmail(email: string): Promise<CoreUser | null> {
    return getJson<CoreUser>(
      `/api/users/${encodeURIComponent(email)}`,
      [`core:user:${email}`],
    );
  }

  async function listUsers(
    opts: { email?: string } = {},
  ): Promise<{ total: number; users: CoreUser[] } | null> {
    const qs = new URLSearchParams();
    if (opts.email) qs.set("email", opts.email);
    const suffix = qs.toString() ? `?${qs}` : "";
    return getJson(`/api/users${suffix}`, ["core:users"]);
  }

  // ── Mutations (write-through pro core) ──────────────────────────────────

  async function createChurchInCore(input: {
    name: string;
    slug: string;
    city: string;
    address?: string;
    phone?: string;
    whatsapp?: string;
    memberCount?: number;
    notes?: string;
  }): Promise<CoreMutationResult<CoreChurch>> {
    return mutate<CoreChurch>("POST", "/api/igrejas", input);
  }

  async function updateChurchInCore(
    id: string,
    patch: Partial<CoreChurch> & { notes?: string | null },
  ): Promise<CoreMutationResult<CoreChurch>> {
    return mutate<CoreChurch>("PATCH", `/api/igrejas/${encodeURIComponent(id)}`, patch);
  }

  async function archiveChurchInCore(id: string): Promise<CoreMutationResult<unknown>> {
    return mutate<unknown>("DELETE", `/api/igrejas/${encodeURIComponent(id)}`);
  }

  async function createPastorInCore(input: {
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    churchId?: string | null;
    isFullTime?: boolean;
    onLeave?: boolean;
  }): Promise<CoreMutationResult<CorePastor>> {
    return mutate<CorePastor>("POST", "/api/pastores", input);
  }

  async function updatePastorInCore(
    id: string,
    patch: Partial<CorePastor> & { churchId?: string | null },
  ): Promise<CoreMutationResult<CorePastor>> {
    return mutate<CorePastor>("PATCH", `/api/pastores/${encodeURIComponent(id)}`, patch);
  }

  async function archivePastorInCore(id: string): Promise<CoreMutationResult<unknown>> {
    return mutate<unknown>("DELETE", `/api/pastores/${encodeURIComponent(id)}`);
  }

  async function createUserInCore(input: {
    email: string;
    name?: string;
    roles?: string[];
    churchId?: string | null;
  }): Promise<CoreMutationResult<CoreUser>> {
    return mutate<CoreUser>("POST", "/api/users", input);
  }

  async function updateUserInCore(
    emailOrId: string,
    patch: Partial<CoreUser>,
  ): Promise<CoreMutationResult<CoreUser>> {
    return mutate<CoreUser>("PATCH", `/api/users/${encodeURIComponent(emailOrId)}`, patch);
  }

  async function revokeUserInCore(emailOrId: string): Promise<CoreMutationResult<unknown>> {
    return mutate<unknown>("DELETE", `/api/users/${encodeURIComponent(emailOrId)}`);
  }

  async function coreStatus(): Promise<{
    ok: boolean;
    igrejas: number;
    pastores: number;
    users: number;
  } | null> {
    const igrejas = await listChurches();
    if (!igrejas) return { ok: false, igrejas: 0, pastores: 0, users: 0 };
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
  async function reportAudit(input: {
    action: string;
    entity: string;
    entityId?: string;
    actorEmail?: string;
    meta?: Record<string, unknown>;
  }): Promise<void> {
    const headers = baseHeaders();
    if (!headers) return;
    try {
      await fetch(`${baseUrl()}/api/audit`, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
      });
    } catch {
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

export type CoreClient = ReturnType<typeof createCoreClient>;
