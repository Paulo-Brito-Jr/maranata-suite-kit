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
export declare const DEFAULT_KEY_AUTH_URL = "https://key.maranata.app";
/**
 * Portal HUMANO do Key — onde a pessoa vê seus apps e fala com a
 * administração. Hoje é o mesmo host do handshake, mas os papéis são
 * distintos: este é destino de clique de usuário (ex.: "Voltar ao portal"
 * numa tela de sem-permissão), `DEFAULT_KEY_AUTH_URL` é host de API.
 * Mantidos separados para que uma eventual separação de hosts no futuro não
 * precise caçar usos.
 */
export declare const MARANATA_KEY_PORTAL_URL = "https://key.maranata.app";
/**
 * Base URL do Key: `MARANATA_KEY_AUTH_URL`, ou o host canônico.
 *
 * `keyUrl` explícito tem precedência sobre a env — é a porta de entrada para
 * testes e para um app que precise falar com uma instância específica.
 */
export declare function maranataKeyBaseUrl(keyUrl?: string): string;
type SsoBaseUrlOptions = {
    /** Modo de login. `"mk"` é o default do Key e não vai na query. */
    mode?: SsoLoginMode;
    /** Força nova autenticação mesmo com sessão viva (`force=1`). */
    force?: boolean;
    /** Sobrescreve a base URL do Key (precede `MARANATA_KEY_AUTH_URL`). */
    keyUrl?: string;
};
/**
 * Prova PKCE do início do handshake. O challenge SHA-256 é sempre base64url
 * sem padding (43 caracteres); o Key não aceita `plain`.
 */
export type SsoPkceStartOptions = {
    codeChallenge: string;
    codeChallengeMethod: "S256";
};
type SsoWithoutPkce = {
    codeChallenge?: never;
    codeChallengeMethod?: never;
};
/**
 * Opções do início do SSO.
 *
 * O literal `"ibm"` torna PKCE obrigatório também no type system. Apps
 * legados continuam podendo omitir PKCE; se optarem por usá-lo, precisam
 * enviar o par challenge + método S256 completo.
 */
export type SsoUrlOptions<AppId extends string = string> = SsoBaseUrlOptions & ([AppId] extends ["ibm"] ? SsoPkceStartOptions : SsoPkceStartOptions | SsoWithoutPkce);
/**
 * URL de início do handshake: manda a pessoa ao Key e volta para `returnUrl`.
 *
 * ⚠️ O Key só libera retorno para as URLs canônicas de cada app
 * (`maranata-key/src/lib/maranata-suite.ts`). Rodar local numa porta
 * não-canônica quebra o SSO **em silêncio** — gotcha conhecido da Suite.
 */
export declare function maranataKeyStartUrl<const AppId extends string>(appId: AppId, returnUrl: string, ...args: [AppId] extends ["ibm"] ? [options: SsoUrlOptions<AppId>] : [options?: SsoUrlOptions<AppId>]): string;
/** URL de logout do SSO, voltando para `returnUrl`. */
export declare function maranataKeyLogoutUrl(appId: string, returnUrl: string, options?: Pick<SsoBaseUrlOptions, "keyUrl">): string;
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
    /** Vínculo eclesiástico explícito; ausente em tickets legados. */
    identityKind?: "CHURCH_MEMBER" | "EXTERNAL" | null;
    /** App ao qual o ticket curto foi emitido. */
    targetApp?: string;
    /** Versão monotônica das autorizações no Key, usada para revogação. */
    authzVersion?: number;
    coreUserId?: string;
    coreChurchId?: string;
    groups?: string[];
    /** AppPapel efetivo por app + permissões granulares por recurso. */
    apps?: Record<string, {
        papel: string;
        perms?: Record<string, string[]>;
    }>;
    /** Claim de ecossistema — parse com `./pastoral`. */
    pastoral?: unknown;
    /** Claim de ecossistema — parse com `./lideranca`. */
    lideranca?: unknown;
};
type VerifyTokenBaseOptions = {
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
 * Opções de verificação vinculadas ao app consumidor.
 *
 * Para `app: "ibm"`, o verifier correspondente ao challenge do início é
 * obrigatório. Apps legados preservam o contrato anterior e podem omiti-lo.
 */
export type VerifyTokenOptions<AppId extends string | undefined = string | undefined> = VerifyTokenBaseOptions & {
    app?: AppId;
} & ([AppId] extends ["ibm"] ? {
    app: "ibm";
    codeVerifier: string;
} : {
    codeVerifier?: string;
});
/**
 * Verifica o token do handshake no Key.
 *
 * **Fail-soft:** devolve `null` para token inválido, Key fora do ar, resposta
 * malformada ou timeout — nunca lança. É o contrato que as 7 cópias já
 * tinham, e o certo aqui: quem chama trata `null` como "não autenticado", e
 * um erro de rede não deve virar 500 na cara do usuário.
 */
export declare function verifyMaranataKeyToken<const AppId extends string | undefined = undefined>(token: string, ...args: [AppId] extends ["ibm"] ? [options: VerifyTokenOptions<AppId>] : [options?: VerifyTokenOptions<AppId>]): Promise<MaranataKeyUser | null>;
export {};
//# sourceMappingURL=sso.d.ts.map