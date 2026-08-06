# @paulo-brito-jr/maranata-suite-kit

App switcher unificado da **Suite Maranata** (IME Maranata). Substitui as 3
cópias hardcoded divergentes de "trocar de app" (rodizio-maranata,
maranata-core, ...) por um pacote único: catálogo canônico + client de
membership fail-soft + componente de UI portátil.

## Por que existe

Hoje cada app da Suite mantém sua própria lista fixa de apps (nome, URL,
descrição), copiada e colada — quando um app muda de URL ou um app novo
entra na Suite, é preciso lembrar de editar N arquivos. Este pacote resolve
isso com uma fonte única, versionada, distribuída como os outros pacotes do
Paulo (ver `brito-ai-kit`).

**Fonte de verdade upstream:** o catálogo real dos apps da Suite vive no
[maranata-key](https://github.com/Paulo-Brito-Jr/maranata-key)
(`src/lib/maranata-suite.ts → MARANATA_SUITE_APPS`). App novo entra **lá**
primeiro; `./catalog` aqui é um snapshot read-only resincronizado manualmente
(só os campos que o switcher precisa: slug/nome/url/icon/cor).

## Instalação (git submodule + `file:`, como o brito-ai-kit)

Este pacote **não** é consumido via npm registry no dia a dia — é vendorizado
como submodule, igual ao `brito-ai-kit` já é consumido em Finanças e Brito's
Skynet:

```bash
git submodule add https://github.com/Paulo-Brito-Jr/maranata-suite-kit.git vendor/maranata-suite-kit
```

`package.json` do app consumidor:

```json
{
  "dependencies": {
    "@paulo-brito-jr/maranata-suite-kit": "file:vendor/maranata-suite-kit"
  }
}
```

`dist/` já vem **commitado** neste repo — não é preciso rodar build no app
consumidor, só `pnpm install` (ou `npm install`) depois de trazer o submodule.

Pra atualizar depois de um patch novo:

```bash
cd vendor/maranata-suite-kit && git pull origin main && cd ../..
pnpm install
```

## Uso por app

### 1. Server Component — busca membership com fallback pro catálogo

```tsx
// app/layout.tsx (ou onde o app monta o header)
import { fetchMembershipApps } from "@paulo-brito-jr/maranata-suite-kit/membership";
import { catalogAsApps } from "@paulo-brito-jr/maranata-suite-kit/fallback";
import { AppSwitcher } from "@paulo-brito-jr/maranata-suite-kit/app-switcher";

const CURRENT_SLUG = "rodizio"; // slug deste app no catálogo

export async function SuiteHeader({ email }: { email: string }) {
  const apps =
    (await fetchMembershipApps({
      email,
      integrationKey: process.env.MARANATA_INTEGRATION_KEY!,
      source: CURRENT_SLUG,
    })) ?? catalogAsApps(CURRENT_SLUG);

  return <AppSwitcher apps={apps} currentSlug={CURRENT_SLUG} />;
}
```

`fetchMembershipApps` é **fail-soft**: timeout (default 3s), erro de rede,
resposta não-ok ou corpo inesperado — tudo vira `null`, nunca lança. Por
isso o `?? catalogAsApps(CURRENT_SLUG)`: se o maranata-key estiver fora do
ar, lento, ou a integration key não estiver configurada neste app ainda, o
switcher continua funcionando com a lista estática do catálogo (mesmo
comportamento das cópias hardcoded de hoje, mas com URLs corretas).

Apps sensíveis ou que aceitam pessoas externas, como o IBM, não devem anunciar
o catálogo inteiro em uma falha do Key. Use o fallback fechado:

```ts
const apps = membership ?? catalogAsApps("ibm", { mode: "current-only" });
// somente IBM, papel ACESSO (piso zero)
```

### 2. `./catalog` — snapshot estático + resolução de URL canônica

```ts
import { MARANATA_SUITE_CATALOG, canonicalAppUrl } from "@paulo-brito-jr/maranata-suite-kit/catalog";

canonicalAppUrl("rodizio", "https://rodizio-maranata.vercel.app");
// → "https://rodizio.maranata.app" (catálogo sempre vence sobre URL de banco)

canonicalAppUrl("app-novo-nao-sincronizado", "https://exemplo.com");
// → "https://exemplo.com" (slug desconhecido usa o fallback informado)
```

### 3. `./membership` — client fail-soft do maranata-key

```ts
import { fetchMembershipApps } from "@paulo-brito-jr/maranata-suite-kit/membership";

const apps = await fetchMembershipApps({
  email: "pastor@maranata.app",
  integrationKey: process.env.MARANATA_INTEGRATION_KEY!,
  source: "rodizio", // aparece como x-source no maranata-key
  // keyUrl?: default = process.env.MARANATA_KEY_AUTH_URL ?? "https://key.maranata.app"
  // timeoutMs?: default 3000
});
// null em qualquer falha (rede, timeout, 4xx/5xx, JSON inesperado) — nunca lança.
```

**Variável de ambiente:** `MARANATA_KEY_AUTH_URL`. A env antiga
`MARANATA_KEY_URL` (usada em alguma cópia hardcoded anterior) foi
descontinuada por design — **não** tem efeito neste pacote. Padronize os
apps consumidores em `MARANATA_KEY_AUTH_URL`.

### 4. `./fallback` — catálogo estático como `MembershipApp[]`

```ts
import { catalogAsApps } from "@paulo-brito-jr/maranata-suite-kit/fallback";

const apps = catalogAsApps("rodizio"); // papel "USUARIO", via "direct", URL canônica
const ibm = catalogAsApps("ibm", { mode: "current-only" }); // somente IBM, papel "ACESSO"
const nenhum = catalogAsApps("ibm", { mode: "none" }); // []
```

`ACESSO` confirma apenas a entrada no app e não concede ações sobre recursos.
Ownership, matrícula, turma e janela continuam sob autorização do domínio.

### 5. `./sso` — introspecção vinculada ao app e PKCE do IBM

```ts
const loginUrl = maranataKeyStartUrl("ibm", callbackUrl, {
  codeChallenge,
  codeChallengeMethod: "S256",
});

const user = await verifyMaranataKeyToken(ticket, {
  app: "ibm",
  codeVerifier,
});
```

Passar `app` faz o Key revalidar a concessão atual e o app-alvo do ticket. Um
consumidor não deve aceitar apenas a assinatura do ticket.

Para o IBM, o contrato é estrito: `maranataKeyStartUrl()` exige o challenge
SHA-256 em base64url (sem padding) e envia `code_challenge_method=S256`;
`verifyMaranataKeyToken()` exige o verifier correspondente e o envia somente
no corpo `POST` como `code_verifier`, nunca na URL. O app deve manter o verifier
efêmero no servidor ou em cookie `HttpOnly`, vinculado ao `state`, e descartá-lo
no primeiro uso. Chamadas legadas dos demais apps continuam válidas sem PKCE.

### 6. `./app-switcher` — componente React apresentacional

```tsx
import { AppSwitcher } from "@paulo-brito-jr/maranata-suite-kit/app-switcher";

<AppSwitcher apps={apps} currentSlug="rodizio" className="ml-2" />;
```

- `"use client"`, zero fetch interno — recebe `apps` já resolvido.
- Zero dependência do host além de `react` (peer) — nada de
  `@/components/ui/*` nem lucide. Ícone/cor vêm do catálogo local por slug
  (emoji/char), com fallback pra inicial do nome.
- Estilo "button cru + Tailwind" (variante mais completa hoje em
  `rodizio-maranata/components/layout/app-switcher.tsx`): dropdown com
  checkmark no app atual, fecha em click-fora/Esc.
- Usa os tokens Tailwind/shadcn já convencionados na Suite
  (`border-border`, `bg-popover`, `text-muted-foreground`, etc.) — funciona
  em qualquer um dos ~10 apps, com ou sem shadcn configurado, desde que o
  tema exponha essas CSS vars (todos já expõem).

## Exports

| Subpath | Conteúdo |
|---|---|
| `./core` | Cliente e tipos canônicos de Church/Pastor/User |
| `./catalog` | `MARANATA_SUITE_CATALOG`, `SuiteCatalogEntry`, `canonicalAppUrl()` |
| `./membership` | `fetchMembershipApps()`, `MembershipApp`, `Papel` |
| `./app-switcher` | `AppSwitcher` (componente `"use client"`) |
| `./fallback` | `catalogAsApps()` |
| `./permissions` | Helpers para grants granulares |
| `./sso` | Handshake com o Key: `maranataKeyStartUrl()`, `maranataKeyLogoutUrl()`, `verifyMaranataKeyToken()`, `maranataKeyBaseUrl()` |
| `./pastoral` | Claim pastoral canônica |
| `./lideranca` | Claim de liderança ministerial canônica |
| `./servico` | Claim de funções de servir (EBD, discipulado, mentoria) — federada e empilhável |
| `./grupos` | Detalhe de escopo por grupo (GERAL/IGREJA/MINISTERIO/MINISTERIO_LOCAL/PILAR) — F2 do Permissionamento v3 |
| `./integration-status` | Contrato `integration-status.v1` |
| `./tutorial` | Contrato headless e `resolveTutorialVisibility()` |

Sem export de `.` (raiz) — igual ao `brito-ai-kit`, só subpaths.

## Scripts

```bash
pnpm install      # devDependencies: typescript + @types/react (zero runtime deps)
pnpm build        # tsc -p tsconfig.build.json → dist/ (js + .d.ts, commitado)
pnpm typecheck    # tsc --noEmit
pnpm smoke        # node scripts/smoke.mjs — exercita canonicalAppUrl + catalogAsApps contra dist/
pnpm test:tutorial-editorial # testa o validador dos manifestos da Fase 1
pnpm test:tutorial-resolver  # build + testes do resolver fail-closed da Fase 2
```

`dist/` é **commitado** (não gitignored) — é assim que os apps consumidores
via submodule pegam o build pronto sem precisar rodar `tsc` neles mesmos.
Sempre `pnpm build` antes de commitar uma mudança em `src/`.

## Inventário editorial dos tutoriais

A Fase 1 do programa de tutoriais usa um manifesto factual por app, antes do
contrato executável:

```text
docs/tutorial/editorial-manifest.v1.json
```

O formato, o vocabulário de papéis efetivos/legados/reservados e as regras de
evidência estão em
[`docs/tutorial/editorial-manifest-v1.md`](docs/tutorial/editorial-manifest-v1.md).
Para validar um ou mais artefatos sem instalar dependências:

```bash
node scripts/validate-tutorial-editorial-manifests.mjs \
  ../maranata-key/docs/tutorial/editorial-manifest.v1.json \
  ../agenda-maranata/docs/tutorial/editorial-manifest.v1.json
```

Esse manifesto é editorial. Tipos, schema e resolução server-side pertencem à
Fase 2 e não devem ser inferidos como já entregues só porque o inventário
passou.

## Tutorial headless

O subpath `./tutorial` contém o contrato executável
`tutorial-manifest.v1`. Ele não interpreta as listas editoriais de papel,
permissão ou escopo. Cada app mantém um adapter server-side que traduz sua
sessão real em IDs de perfis já autorizados:

```ts
import {
  resolveTutorialVisibility,
  type StandardTutorialManifest,
  type TutorialAccessDecision,
} from "@paulo-brito-jr/maranata-suite-kit/tutorial";

// Arquivo .server.ts do app consumidor.
const access: TutorialAccessDecision = {
  kind: "authenticated",
  authorizedProfileIds: await resolveAuthorizedTutorialProfiles(session),
  canPreviewAllProfiles: session.user.roles.includes("SUPER_ADMIN"),
  view: { kind: "mine" },
};

const result = resolveTutorialVisibility(
  tutorialManifest satisfies StandardTutorialManifest,
  access,
);

if (!result.ok) {
  // Não enviar manifesto bruto ao Client Component.
  return <TutorialUnavailable code={result.code} />;
}

return <TutorialExplorer resolved={result} />;
```

Regras da fronteira:

- sessão/claims inválidos viram `{ kind: "invalid" }`, nunca visitante;
- `{ kind: "anonymous" }` é uma decisão explícita para conteúdo público;
- usuário autenticado sem perfis continua distinto dos dois casos acima;
- `authorizedProfileIds` já chega decidido pelo código real do app;
- `canPreviewAllProfiles` é capability separada e, por padrão, exclusiva de
  `SUPER_ADMIN`;
- `preview-profile` e `all-profiles` selecionam documentação sintética, sem
  impersonar usuário, alterar sessão ou consultar pessoas;
- pedido de preview sem capability falha, sem fallback silencioso;
- perfil desconhecido, drift de versão ou manifesto inválido fecham todo o
  conteúdo;
- audiência `{ kind: "public" }` modela conteúdo público sem inventar um
  perfil `"public"`;
- o schema valida integralmente tópicos, steps, mídias, captures e callouts;
- tópico público aceita somente mídia marcada como `public-safe`;
- desktop e mobile são variantes independentes, cada uma com capture, hash,
  exposição e callouts próprios;
- mídia usa caminho interno, de 1 a 4 callouts, e o perfil sintético da
  captura precisa pertencer à audiência do tópico;
- `private` não substitui ACL: a variante privada deve ser servida por rota
  autenticada do app, nunca colocada em diretório público previsível;
- o resultado remove audiências e jornadas proibidas antes de chegar ao
  cliente.

O resolver é puro, sem `server-only`, built-ins de Node ou dependência de
runtime. A matriz do CI cobre Node 18, 20 e 22; a garantia server-side pertence
ao adapter e à rota do consumidor.

## Dependências

- **Peer:** `react >=18 <20` (opcional — só `./app-switcher` usa; os demais
  subpaths são TypeScript puro, sem JSX).
- **Runtime:** nenhuma. `./membership` usa `fetch`/`AbortSignal.timeout`
  nativos do runtime (Node 18+ / Edge / browser).
- **Dev:** só `typescript` + `@types/react` (`.npmrc` fixa
  `auto-install-peers=false` de propósito, pra não deixar o pnpm puxar
  `react` de verdade pro `node_modules` local — o pacote compila com
  `@types/react` sozinho, que já embute `jsx-runtime.d.ts`).

### Nota de implementação: sem `@types/node`

`./membership` lê `process.env.MARANATA_KEY_AUTH_URL` como default, mas este
pacote **não** instala `@types/node` (fora do escopo combinado). Em vez de
`declare global { var process: ... }` (que colidiria com o `@types/node`
real de qualquer app consumidor no momento de compilar o `dist/*.d.ts`
junto do próprio código do host), o acesso é feito via `globalThis` com um
cast local em `readEnv()` — sem poluir nenhum escopo global, funciona em
Node (onde `process` existe) e devolve `undefined` em runtimes sem
`process` (Edge/browser), na mesma linha fail-soft do resto do client.

## Pendências conhecidas

- **Sem ESLint configurado.** `npm run lint` / `lint:strict` são stubs que
  avisam e saem 0 (não bloqueiam o `pre-push`). Adicionar quando o pacote
  crescer o suficiente pra justificar.
- **Sincronização do catálogo é manual.** Se o maranata-key ganhar um app
  novo (ou mudar uma URL), é preciso replicar em `src/catalog.ts` aqui e
  publicar um patch — não há automação de sync ainda.
- **`MARANATA_KEY_AUTH_URL` aponta pra `https://auth.maranata.app` por
  default** — confirme que esse domínio (custom domain do maranata-key)
  está de fato provisionado antes de depender do default em produção; caso
  contrário, configure a env explicitamente com a URL real de deploy do
  maranata-key.

## Gate (pre-push)

`.githooks/` replicado do padrão universal L99 (mesmo de `brito-auth`):
`core.hooksPath=.githooks` (setado via `npm run prepare`, roda no
`postinstall`/`prepare` do npm). O hook roda `typecheck` + `lint:strict`
antes de qualquer `git push`; bypass com `git push --no-verify` (não
recomendado).
