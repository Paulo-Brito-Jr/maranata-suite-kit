# Manifesto editorial de tutorial v1

Este documento define o artefato da Fase 1 do programa de tutoriais da Suite
Maranata. Ele registra o que existe no código e orienta a redação; não é ainda
o contrato executável da Fase 2.

Cada app mantém o arquivo:

```text
docs/tutorial/editorial-manifest.v1.json
```

## Estrutura

```json
{
  "format": "maranata-tutorial-editorial-manifest",
  "formatVersion": "1.0.0",
  "app": {
    "slug": "exemplo",
    "name": "Exemplo",
    "repository": "Paulo-Brito-Jr/exemplo-maranata",
    "productionUrl": "https://exemplo.maranata.app",
    "tutorial": {
      "currentState": "absent",
      "currentRoute": null,
      "currentExposure": "absent",
      "targetRoute": "/tutorial",
      "targetExposure": "authenticated",
      "desktopDiscovery": "absent",
      "mobileDiscovery": "absent"
    }
  },
  "audit": {
    "status": "technical-audit",
    "owner": "Exemplo Maranata",
    "reviewedAt": "2026-07-25",
    "sourceCommit": "abcdef0",
    "evidence": [
      "app/exemplo/page.tsx:10"
    ]
  },
  "access": {
    "roleInventory": [
      {
        "id": "ADMIN",
        "source": "app",
        "classification": "effective",
        "evidence": [
          "lib/auth.ts:20"
        ]
      }
    ],
    "claims": [
      {
        "id": "igreja",
        "state": "enforced",
        "evidence": [
          "lib/auth.ts:30"
        ]
      }
    ],
    "previewAllProfiles": {
      "allowedFor": [
        "SUPER_ADMIN"
      ],
      "developerDefault": false
    }
  },
  "profiles": [
    {
      "id": "admin",
      "label": "Administrador",
      "classification": "effective",
      "effectiveWhen": {
        "globalRoles": [],
        "appRoles": [
          "ADMIN"
        ],
        "permissions": [],
        "scopes": []
      },
      "capabilities": [
        "Gerenciar o domínio do app"
      ],
      "limits": [
        "Não altera autorização de outros apps"
      ],
      "journeyIds": [
        "administrar-exemplo"
      ],
      "evidence": [
        "lib/auth.ts:20"
      ]
    }
  ],
  "topics": [
    {
      "id": "administracao",
      "title": "Administração",
      "profileIds": [
        "admin"
      ],
      "visibility": {
        "public": false,
        "globalRoles": [],
        "appRoles": [
          "ADMIN"
        ],
        "permissions": [],
        "scopes": []
      },
      "journeyIds": [
        "administrar-exemplo"
      ]
    }
  ],
  "journeys": [
    {
      "id": "administrar-exemplo",
      "title": "Administrar o exemplo",
      "profileIds": [
        "admin"
      ],
      "entry": {
        "route": "/exemplo",
        "anchorCandidates": [
          "exemplo-lista"
        ],
        "preconditions": [
          "Sessão com papel ADMIN"
        ]
      },
      "actions": [
        "Abrir a lista",
        "Criar ou editar um item"
      ],
      "expectedResult": "O item aparece na lista.",
      "emptyState": "A lista orienta como criar o primeiro item.",
      "errorState": "A interface explica a falta de permissão ou a falha sem expor dados.",
      "authorizationEvidence": [
        "app/exemplo/page.tsx:10",
        "lib/auth.ts:20"
      ],
      "visuals": {
        "desktop": 1,
        "mobile": 1,
        "notes": [
          "Usar somente fixture sintética"
        ]
      }
    }
  ],
  "content": {
    "public": [],
    "authenticated": [
      "Todos os tópicos operacionais"
    ]
  },
  "visualBudget": {
    "desktop": 1,
    "mobile": 1,
    "total": 2
  },
  "openQuestions": []
}
```

## Vocabulário fechado

- `currentState`: `native-partial`, `generic-link` ou `absent`.
- `currentExposure`: `public`, `authenticated`, `mixed` ou `absent`.
- `targetExposure`: `public`, `authenticated` ou `mixed`.
- descoberta: `present`, `desktop-only`, `mobile-only` ou `absent`.
- `source`: `global`, `app`, `event`, `runtime`, `database`, `claim` ou
  `policy`. Use `policy` para uma função de decisão/autorização que não é um
  papel de sessão, como uma assinatura de governança.
- `classification`: `effective`, `legacy-mapped`, `reserved`, `schema-only`
  ou `runtime-divergent`.
- claim `state`: `absent`, `captured` ou `enforced`.
- `audit.status`: `technical-audit` até a aprovação editorial do owner.

O mesmo texto de papel pode aparecer em fontes distintas, por exemplo
`global:ADMIN` e `app:ADMIN`; a identidade do inventário é o par
`source + id`. Todo valor usado em `globalRoles` precisa de uma entrada
`source: global`; valores usados em `appRoles` precisam de uma entrada
`app`, `event`, `runtime` ou `database`. Essa separação impede confundir o
papel recebido da Key com o papel efetivamente aplicado pelo app.

## Regras de integridade

1. `sourceCommit` registra o commit auditado, não o commit que adicionará o
   manifesto.
2. `currentRoute/currentExposure` descrevem o que existe no commit auditado;
   `targetRoute/targetExposure` descrevem a rota local planejada. Apps que hoje
   apontam para a Key registram a URL externa somente em `currentRoute`.
3. Somente perfis `effective` recebem jornadas operacionais como disponíveis.
   Legados, reservas e papéis somente de schema podem constar no inventário,
   mas não fingem capacidade entregue.
4. Cada perfil efetivo tem ao menos uma jornada, uma capacidade e um limite.
5. Cada jornada informa entrada, ação, resultado, estado vazio, erro e ao menos
   uma evidência de autorização realmente executada.
6. IDs referenciados em tópicos, perfis e jornadas existem no mesmo arquivo.
7. `visualBudget.total` é a soma de desktop e mobile de todas as jornadas.
8. Toda mídia futura usa dados sintéticos. O manifesto nunca contém nomes,
   e-mails, telefones, documentos, tokens, valores ou URLs privadas reais.
9. `SUPER_ADMIN` é a única audiência padrão de `Todos os perfis`.
   `DESENVOLVEDOR` permanece `developerDefault: false`.
10. Anchors são candidatos editoriais na Fase 1. A Fase 2 formalizará o contrato
   headless e a Fase 3 implementará `data-tutorial-id`.
11. `openQuestions` deve ficar vazio para o gate técnico da Fase 1. Dúvidas
    bloqueantes permanecem explícitas na tarefa, não são convertidas em fatos.

## Semântica editorial, não executável

`effectiveWhen` e `topics[].visibility` formam a matriz auditável da Fase 1.
Eles não são uma expressão booleana pronta para autorização. Um tópico com
`profileIds: ["presidente", "leitor-delegado"]`, por exemplo, pode reunir um
papel local **ou** uma permissão granular; achatar ambos em um único objeto
perderia esse `OR` entre perfis e os `ANDs` internos de cada gate.

Na Fase 2:

- o adapter de cada app traduz a sessão real em um ou mais IDs de perfil
  efetivo;
- `profileIds` representa as audiências editoriais alternativas do tópico;
- o resolver recebe somente perfis já autorizados pelo adapter;
- query string, estado cliente e o próprio manifesto nunca recalculam ou
  ampliam a autorização;
- o schema executável deve representar cláusulas explícitas (`anyOf`/`allOf`)
  quando precisar operar diretamente sobre papéis, permissões e escopos.

Portanto, não implementar um resolver genérico interpretando as quatro listas
de `visibility` como `AND` nem como `OR` global.
