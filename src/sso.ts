/**
 * Handshake SSO com o Maranata Key — fonte única.
 *
 * ## O problema que este módulo resolve
 *
 * Em 2026-07-31 havia **7 cópias** de `lib/maranata-key-sso.ts` na Suite
 * (agenda, festa-amor, financeiro, inchurch-dashboard, maranata-app,
 * ministerio, pastoral). Nenhuma igual à outra: de 50 a 146 linhas, e — o
 * que importa — **três fallbacks de host diferentes lidos de duas envs
 * diferentes**:
 *
 * | App | Env lida | Fallback |
 * |---|---|---|
 * | agenda | `MARANATA_KEY_AUTH_URL` | `key.maranata.app` ✅ |
 * | pastoral, ministerio | `MARANATA_KEY_AUTH_URL` | `auth.maranata.app` (legado) |
 * | inchurch, maranata-app | `MARANATA_KEY_URL` (descontinuada) | `auth.maranata.app` (legado) |
 * | financeiro | `MARANATA_KEY_URL` (descontinuada) | `key.maranata.app` |
 * | festa-amor | `MARANATA_KEY_URL` (descontinuada) | `maranata-key.vercel.app` ⚠️ |
 *
 * Um app cujo deploy perca a env cai num host que ninguém escolheu — no pior
 * caso, o domínio de deploy da Vercel. E como o `verifyMaranataKeyToken` é o
 * que decide *quem entrou*, divergência aqui não é cosmética.
 *
 * ## O que é canônico
 *
 * - **Host:** `https://key.maranata.app`, canônico desde 2026-07-23
 *   (`maranata-key/docs/PERMISSOES.md` → "Domínio"). `auth.maranata.app`
 *   segue respondendo como legado; as rotas `/api/*` vivem nos dois hosts
 *   *"até os apps migrarem `MARANATA_KEY_AUTH_URL`"* — que é exatamente o
 *   que este módulo destrava.
 * - **Env:** `MARANATA_KEY_AUTH_URL`. A antiga `MARANATA_KEY_URL` foi
 *   descontinuada por design (mesma decisão já registrada em
 *   `./membership`) e **não** é lida aqui.
 *
 * ## O que este módulo deliberadamente NÃO faz
 *
 * Não valida o JWT localmente. A verificação continua sendo uma chamada a
 * `POST /api/auth/verify` no Key — é o Key que resolve papel, grupos e
 * permissões efetivas, e nenhum app cliente deve recalcular isso. Este
 * módulo unifica a *chamada*, não a *decisão*.
 */

/** Modos de login aceitos pelo Key no parâmetro `mode` do `/api/sso/start`. */
export type SsoLoginMode = "mk" | "google" | "password" | "otp";

/**
 * Host canônico do Maranata Key. Trocar isto é decisão de plataforma, não de
 * app — por isso mora aqui e não em 7 arquivos.
 */
export const DEFAULT_KEY_AUTH_URL = "https://key.maranata.app";

/**
 * Portal HUMANO do Key — onde a pessoa vê seus apps e fala com a
 * administração. Hoje é o mesmo host do handshake, mas os papéis são
 * distintos: este é destino de clique de usuário (ex.: "Voltar ao portal"
 * numa tela de sem-permissão), `DEFAULT_KEY_AUTH_URL` é host de API.
 * Mantidos separados para que uma eventual separação de hosts no futuro não
 * precise caçar usos.
 */
export const MARANATA_KEY_PORTAL_URL = "https://key.maranata.app";

/**
 * Lê `process.env[name]` sem depender de `@types/node` — mesmo padrão de
 * `./membership` (este pacote não instala `@types/node` de propósito). Em
 * runtimes sem `process` (Edge/browser) devolve `undefined`, e o chamador
 * cai no default.
 */
function readEnv(name: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[name];
}

/** Remove a barra final para a concatenação de path nunca gerar `//api/...`. */
function semBarraFinal(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Base URL do Key: `MARANATA_KEY_AUTH_URL`, ou o host canônico.
 *
 * `keyUrl` explícito tem precedência sobre a env — é a porta de entrada para
 * testes e para um app que precise falar com uma instância específica.
 */
export function maranataKeyBaseUrl(keyUrl?: string): string {
  const bruto = keyUrl ?? readEnv("MARANATA_KEY_AUTH_URL") ?? DEFAULT_KEY_AUTH_URL;
  const limpo = semBarraFinal(bruto.trim());
  return limpo === "" ? DEFAULT_KEY_AUTH_URL : limpo;
}

export type SsoUrlOptions = {
  /** Modo de login. `"mk"` é o default do Key e não vai na query. */
  mode?: SsoLoginMode;
  /** Força nova autenticação mesmo com sessão viva (`force=1`). */
  force?: boolean;
  /** Sobrescreve a base URL do Key (precede `MARANATA_KEY_AUTH_URL`). */
  keyUrl?: string;
};

/**
 * URL de início do handshake: manda a pessoa ao Key e volta para `returnUrl`.
 *
 * ⚠️ O Key só libera retorno para as URLs canônicas de cada app
 * (`maranata-key/src/lib/maranata-suite.ts`). Rodar local numa porta
 * não-canônica quebra o SSO **em silêncio** — gotcha conhecido da Suite.
 */
export function maranataKeyStartUrl(
  appId: string,
  returnUrl: string,
  options: SsoUrlOptions = {},
): string {
  const u = new URL(`${maranataKeyBaseUrl(options.keyUrl)}/api/sso/start`);
  u.searchParams.set("app", appId);
  u.searchParams.set("return", returnUrl);
  if (options.mode && options.mode !== "mk") u.searchParams.set("mode", options.mode);
  if (options.force) u.searchParams.set("force", "1");
  return u.toString();
}

/** URL de logout do SSO, voltando para `returnUrl`. */
export function maranataKeyLogoutUrl(
  appId: string,
  returnUrl: string,
  options: Pick<SsoUrlOptions, "keyUrl"> = {},
): string {
  const u = new URL(`${maranataKeyBaseUrl(options.keyUrl)}/api/sso/logout`);
  u.searchParams.set("app", appId);
  u.searchParams.set("return", returnUrl);
  return u.toString();
}

/**
 * Usuário devolvido pelo `/api/auth/verify`.
 *
 * A união dos campos que as 7 cópias declaravam. Tudo além de
 * `sub`/`email`/`name` é opcional de propósito: o Key inclui `perms` apenas
 * para o app alvo do handshake, e claims de ecossistema (`pastoral`,
 * `lideranca`) podem faltar em tokens emitidos por deploys anteriores ao
 * claim. Um app que precise de um campo específico deve tratar a ausência,
 * não assumir presença.
 *
 * `pastoral` e `lideranca` ficam como `unknown` aqui para este módulo não
 * arrastar dependência de `./pastoral` e `./lideranca`; quem consome os
 * tipa com os parsers daqueles módulos, que é onde a validação mora.
 */
export type MaranataKeyUser = {
  sub: string;
  email: string;
  name: string;
  /** MemberRole global da Suite. */
  role?: string;
  coreUserId?: string;
  coreChurchId?: string;
  groups?: string[];
  /** AppPapel efetivo por app + permissões granulares por recurso. */
  apps?: Record<string, { papel: string; perms?: Record<string, string[]> }>;
  /** Claim de ecossistema — parse com `./pastoral`. */
  pastoral?: unknown;
  /** Claim de ecossistema — parse com `./lideranca`. */
  lideranca?: unknown;
};

export type VerifyTokenOptions = {
  /** Sobrescreve a base URL do Key (precede `MARANATA_KEY_AUTH_URL`). */
  keyUrl?: string;
  /**
   * Timeout da chamada em ms. Default 5000.
   *
   * As cópias antigas não tinham timeout nenhum: o handshake ficava
   * pendurado no tempo padrão do runtime se o Key demorasse. Fail-soft com
   * teto explícito é melhor que login pendurado.
   */
  timeoutMs?: number;
  /** Injeção para teste. Default: `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
};

/**
 * Verifica o token do handshake no Key.
 *
 * **Fail-soft:** devolve `null` para token inválido, Key fora do ar, resposta
 * malformada ou timeout — nunca lança. É o contrato que as 7 cópias já
 * tinham, e o certo aqui: quem chama trata `null` como "não autenticado", e
 * um erro de rede não deve virar 500 na cara do usuário.
 */
export async function verifyMaranataKeyToken(
  token: string,
  options: VerifyTokenOptions = {},
): Promise<MaranataKeyUser | null> {
  const { keyUrl, timeoutMs = 5000, fetchImpl } = options;
  const doFetch = fetchImpl ?? globalThis.fetch;
  if (typeof doFetch !== "function") return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await doFetch(`${maranataKeyBaseUrl(keyUrl)}/api/auth/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { valid?: boolean; user?: MaranataKeyUser };
    return j?.valid && j.user ? j.user : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
