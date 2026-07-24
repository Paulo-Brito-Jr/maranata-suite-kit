# Como contribuir — maranata-suite-kit

App do ecossistema da Igreja Maranata (Suite Maranata).

## Fluxo de trabalho (obrigatório)

1. Atualize a base: `git checkout main && git pull` (neste repo a branch principal pode ser `master`)
2. Crie sua branch: `git checkout -b dev/<seu-nome>/<tema>` — ex.: `dev/daniel/ajuste-relatorio`
3. Commits pequenos e claros (conventional commits: `feat:`, `fix:`, `docs:`, `chore:`…)
4. Faça push da branch e abra um **Pull Request** no GitHub
5. O PR gera um **preview** na Vercel — confira sua mudança por lá
6. Aguarde revisão/aprovação. Merge na branch principal = deploy automático em produção

A branch principal é protegida: **ninguém** pusha direto — sempre via PR.

## Rodando localmente

1. `pnpm install`
2. Copie `.env.example` para `.env.local` e peça os **valores de desenvolvimento** ao Paulo — nunca use credenciais de produção
3. `pnpm dev`

## Regras de ouro

- **Nunca** commitar segredos (`.env*`, chaves, tokens)
- Não instalar dependência nova sem combinar antes (política de supply chain: cooldown de 7 dias + versão fixada)
- Dados reais de produção (membros, financeiro) não saem do ambiente de produção
- Mudança de banco (migration) vai no PR como arquivo — quem aplica em produção é o Paulo
