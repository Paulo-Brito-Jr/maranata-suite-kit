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
  // keyUrl?: default = process.env.MARANATA_KEY_AUTH_URL ?? "https://auth.maranata.app"
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
```

### 5. `./app-switcher` — componente React apresentacional

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

| Subpath           | Conteúdo                                                             |
|-------------------|------------------------------------------------------------------------|
| `./catalog`       | `MARANATA_SUITE_CATALOG`, `SuiteCatalogEntry`, `canonicalAppUrl()`      |
| `./membership`    | `fetchMembershipApps()`, `MembershipApp`, `Papel`, `FetchMembershipAppsOptions` |
| `./app-switcher`  | `AppSwitcher` (componente `"use client"`), `AppSwitcherProps`           |
| `./fallback`      | `catalogAsApps()`                                                       |

Sem export de `.` (raiz) — igual ao `brito-ai-kit`, só subpaths.

## Scripts

```bash
pnpm install      # devDependencies: typescript + @types/react (zero runtime deps)
pnpm build        # tsc -p tsconfig.build.json → dist/ (js + .d.ts, commitado)
pnpm typecheck    # tsc --noEmit
pnpm smoke        # node scripts/smoke.mjs — exercita canonicalAppUrl + catalogAsApps contra dist/
```

`dist/` é **commitado** (não gitignored) — é assim que os apps consumidores
via submodule pegam o build pronto sem precisar rodar `tsc` neles mesmos.
Sempre `pnpm build` antes de commitar uma mudança em `src/`.

## Dependências

- **Peer:** `react >=18 <20` (opcional — só `./app-switcher` usa; os outros
  3 subpaths são TypeScript puro, sem JSX).
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
