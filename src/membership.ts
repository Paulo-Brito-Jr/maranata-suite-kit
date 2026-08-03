import { canonicalAppUrl } from "./catalog.js";

/**
 * Payload de membership do maranata-key.
 * Espelha `EffectiveApp` de
 * /Users/paulobrito/dev/maranata-key/src/lib/membership.ts
 */
export type Papel = "ADMIN" | "ADMIN_SEM_EXCLUIR" | "USUARIO" | "VIEWER";

export type MembershipApp = {
  slug: string;
  nome: string;
  url: string;
  papel: Papel;
  /** "role" = full-access por MemberRole; "federated" = super admin da família via Brito Auth. */
  via: "direct" | "group" | "role" | "federated";
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

const DEFAULT_KEY_URL = "https://auth.maranata.app";

/**
 * Lê `process.env[name]` sem depender de `@types/node` (este pacote não
 * instala @types/node de propósito — ver README "Pendências conhecidas").
 * Acesso via `globalThis` com cast LOCAL (não é `declare global`), então não
 * declara um `process` ambiente que colidiria com o `@types/node` real de
 * quem consome este pacote. Roda em Node (onde `process` existe); em
 * runtimes sem `process` (Edge/browser) devolve `undefined` — fail-soft.
 */
function readEnv(name: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[name];
}

const PAPEIS_VALIDOS: readonly Papel[] = ["ADMIN", "ADMIN_SEM_EXCLUIR", "USUARIO", "VIEWER"];

const VIAS_VALIDAS = new Set(["direct", "group", "role", "federated"]);

function isPapel(value: unknown): value is Papel {
  return typeof value === "string" && (PAPEIS_VALIDOS as readonly string[]).includes(value);
}

type RawMembershipApp = {
  slug?: unknown;
  nome?: unknown;
  url?: unknown;
  papel?: unknown;
  via?: unknown;
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
export async function fetchMembershipApps(
  options: FetchMembershipAppsOptions,
): Promise<MembershipApp[] | null> {
  const { email, integrationKey, source } = options;
  const timeoutMs = options.timeoutMs ?? 3_000;
  const keyUrl = (options.keyUrl ?? readEnv("MARANATA_KEY_AUTH_URL") ?? DEFAULT_KEY_URL).replace(
    /\/+$/,
    "",
  );

  if (!email || !integrationKey) return null;

  try {
    const res = await fetch(`${keyUrl}/api/membership/${encodeURIComponent(email)}`, {
      headers: {
        Authorization: `Bearer ${integrationKey}`,
        "x-source": source,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;

    const body = (await res.json()) as { apps?: unknown };
    if (!Array.isArray(body.apps)) return null;

    const apps: MembershipApp[] = [];
    for (const raw of body.apps as RawMembershipApp[]) {
      if (typeof raw.slug !== "string" || typeof raw.nome !== "string" || !isPapel(raw.papel)) {
        continue;
      }
      const rawUrl = typeof raw.url === "string" ? raw.url : null;
      const url = canonicalAppUrl(raw.slug, rawUrl);
      if (!url) continue;

      apps.push({
        slug: raw.slug,
        nome: raw.nome,
        url,
        papel: raw.papel,
        via: (typeof raw.via === "string" && VIAS_VALIDAS.has(raw.via)
          ? raw.via
          : "direct") as MembershipApp["via"],
      });
    }
    return apps;
  } catch {
    return null;
  }
}
