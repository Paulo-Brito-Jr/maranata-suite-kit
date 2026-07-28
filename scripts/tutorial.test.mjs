import assert from "node:assert/strict";
import { test } from "node:test";

import {
  TUTORIAL_INPUT_LIMITS,
  TUTORIAL_MANIFEST_SCHEMA_VERSION,
  resolveTutorialVisibility,
  validateTutorialManifest,
} from "@paulo-brito-jr/maranata-suite-kit/tutorial";

const VALID_DESKTOP_SHA256 = "a".repeat(64);
const VALID_MOBILE_SHA256 = "c".repeat(64);
const VALID_SOURCE_COMMIT = "b".repeat(40);

function capture(profileId, sha256, overrides = {}) {
  const {
    viewport: viewportOverrides,
    ...captureOverrides
  } = overrides;

  return {
    route: "/dashboard",
    profileId,
    viewport: {
      width: 1440,
      height: 900,
      devicePixelRatio: 2,
      ...viewportOverrides,
    },
    theme: "light",
    locale: "pt-BR",
    timezone: "America/Sao_Paulo",
    fixtureVersion: "2026.07.25",
    sourceCommit: VALID_SOURCE_COMMIT,
    sha256,
    ...captureOverrides,
  };
}

function callout(number = 1, overrides = {}) {
  return {
    number,
    label: `Ação ${number}`,
    description: `Controle seguro número ${number}.`,
    xPct: 12.5,
    yPct: 20,
    widthPct: 30,
    heightPct: 18,
    ...overrides,
  };
}

function mediaVariant(
  id,
  variant,
  profileId,
  exposure,
  overrides = {},
) {
  const {
    callouts = [callout()],
    capture: captureOverrides,
    ...variantOverrides
  } = overrides;
  const isMobile = variant === "mobile";

  return {
    src: `/tutorial-media/${id}-${variant}.png`,
    exposure,
    callouts,
    capture: capture(
      profileId,
      isMobile ? VALID_MOBILE_SHA256 : VALID_DESKTOP_SHA256,
      {
        viewport: isMobile
          ? {
              width: 390,
              height: 844,
              devicePixelRatio: 3,
            }
          : undefined,
        ...captureOverrides,
      },
    ),
    ...variantOverrides,
  };
}

function media(id, profileId, exposure, overrides = {}) {
  const {
    desktop: desktopOverrides,
    mobile: mobileOverrides,
    ...mediaOverrides
  } = overrides;

  return {
    id: `${id}-media`,
    kind: "screenshot",
    alt: `Tela do fluxo ${id}`,
    caption: `Etapa principal do fluxo ${id}.`,
    longDescription: `Descrição textual completa da tela usada no fluxo ${id}.`,
    desktop: mediaVariant(
      id,
      "desktop",
      profileId,
      exposure,
      desktopOverrides,
    ),
    mobile: mediaVariant(
      id,
      "mobile",
      profileId,
      exposure,
      mobileOverrides,
    ),
    ...mediaOverrides,
  };
}

function topicDocument(id, profileId, exposure = "private") {
  return {
    title: `Tópico ${id}`,
    summary: `Resumo operacional do tópico ${id}.`,
    steps: [
      {
        id: `${id}-step`,
        title: `Executar ${id}`,
        body: `Siga a orientação segura para concluir ${id}.`,
        expectedResult: `O fluxo ${id} termina com sucesso.`,
        media: [media(id, profileId, exposure)],
      },
    ],
  };
}

function journeyDocument(id) {
  return {
    title: `Jornada ${id}`,
    entryRoute: "/dashboard",
    expectedResult: `A jornada ${id} é concluída.`,
  };
}

function executableManifest() {
  return {
    schemaVersion: "tutorial-manifest.v1",
    app: "exemplo",
    version: "2026.07.25",
    profiles: [
      { id: "admin", label: "Administrador" },
      { id: "reader", label: "Leitor" },
      { id: "editor", label: "Editor" },
    ],
    topics: [
      {
        id: "editor-topic",
        audience: { kind: "profiles", profileIds: ["editor"] },
        journeyIds: ["editor-guide", "shared-guide"],
        content: topicDocument("editor-topic", "editor"),
      },
      {
        id: "public-topic",
        audience: { kind: "public" },
        journeyIds: ["public-start", "reader-guide", "admin-guide"],
        content: topicDocument("public-topic", null, "public-safe"),
      },
      {
        id: "reader-topic",
        audience: { kind: "profiles", profileIds: ["reader"] },
        journeyIds: ["reader-guide", "shared-guide"],
        content: topicDocument("reader-topic", "reader"),
      },
      {
        id: "shared-topic",
        audience: {
          kind: "profiles",
          profileIds: ["reader", "editor"],
        },
        journeyIds: ["shared-guide"],
        content: topicDocument("shared-topic", "reader"),
      },
      {
        id: "admin-topic",
        audience: { kind: "profiles", profileIds: ["admin"] },
        journeyIds: ["admin-guide", "public-orphan", "reader-orphan"],
        content: topicDocument("admin-topic", "admin"),
      },
    ],
    journeys: [
      {
        id: "editor-guide",
        audience: { kind: "profiles", profileIds: ["editor"] },
        content: journeyDocument("editor-guide"),
      },
      {
        id: "public-start",
        audience: { kind: "public" },
        content: journeyDocument("public-start"),
      },
      {
        id: "reader-guide",
        audience: { kind: "profiles", profileIds: ["reader"] },
        content: journeyDocument("reader-guide"),
      },
      {
        id: "shared-guide",
        audience: {
          kind: "profiles",
          profileIds: ["reader", "editor"],
        },
        content: journeyDocument("shared-guide"),
      },
      {
        id: "admin-guide",
        audience: { kind: "profiles", profileIds: ["admin"] },
        content: journeyDocument("admin-guide"),
      },
      {
        id: "public-orphan",
        audience: { kind: "public" },
        content: journeyDocument("public-orphan"),
      },
      {
        id: "reader-orphan",
        audience: { kind: "profiles", profileIds: ["reader"] },
        content: journeyDocument("reader-orphan"),
      },
    ],
  };
}

function authenticatedAccess(overrides = {}) {
  return {
    kind: "authenticated",
    authorizedProfileIds: ["reader"],
    canPreviewAllProfiles: false,
    ...overrides,
  };
}

function ids(items) {
  return items.map((item) => item.id);
}

function assertFailure(result, code) {
  assert.equal(result.ok, false);
  assert.equal(result.code, code);
  assert.deepEqual(
    Object.keys(result).sort(),
    ["code", "ok"],
    `falha ${code} deve ter envelope exato e sem canal lateral`,
  );

  for (const field of [
    "content",
    "activeProfiles",
    "profileOptions",
    "topics",
    "journeys",
    "issues",
  ]) {
    assert.equal(
      Object.hasOwn(result, field),
      false,
      `falha ${code} não pode carregar ${field}`,
    );
  }
}

function assertInvalidManifestValidation(result) {
  assert.equal(result.ok, false);
  assert.ok(Array.isArray(result.issues));
  assert.ok(result.issues.length > 0);

  for (const field of [
    "manifest",
    "content",
    "profiles",
    "topics",
    "journeys",
  ]) {
    assert.equal(
      Object.hasOwn(result, field),
      false,
      `validação inválida não pode carregar ${field}`,
    );
  }
}

function callWithoutThrow(callback, message) {
  let value;
  assert.doesNotThrow(() => {
    value = callback();
  }, message);
  return value;
}

function assertInvalidManifest(rawManifest) {
  const validation = callWithoutThrow(
    () => validateTutorialManifest(rawManifest),
    "a validação pública deve falhar fechado sem lançar",
  );
  assertInvalidManifestValidation(validation);

  const resolution = callWithoutThrow(
    () =>
      resolveTutorialVisibility(
        rawManifest,
        authenticatedAccess(),
      ),
    "o resolver público deve falhar fechado sem lançar",
  );
  assertFailure(resolution, "invalid-manifest");
  return validation;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

test("exporta a versão canônica e valida um manifesto STANDARD completo", () => {
  assert.equal(
    TUTORIAL_MANIFEST_SCHEMA_VERSION,
    "tutorial-manifest.v1",
  );

  const validation = validateTutorialManifest(executableManifest());
  assert.equal(validation.ok, true);
  assert.equal(
    validation.manifest.topics[0].content.steps[0].media[0].desktop.capture
      .sha256,
    VALID_DESKTOP_SHA256,
  );
});

test("desktop e mobile preservam captures e hashes independentes", () => {
  const validation = validateTutorialManifest(executableManifest());
  assert.equal(validation.ok, true);

  const mediaEntry =
    validation.manifest.topics[0].content.steps[0].media[0];
  assert.equal(
    mediaEntry.desktop.capture.sha256,
    VALID_DESKTOP_SHA256,
  );
  assert.equal(
    mediaEntry.mobile.capture.sha256,
    VALID_MOBILE_SHA256,
  );
  assert.notEqual(
    mediaEntry.desktop.capture.sha256,
    mediaEntry.mobile.capture.sha256,
  );
  assert.notEqual(mediaEntry.desktop.src, mediaEntry.mobile.src);
  assert.notDeepEqual(
    mediaEntry.desktop.capture.viewport,
    mediaEntry.mobile.capture.viewport,
  );
  assert.notStrictEqual(
    mediaEntry.desktop.capture,
    mediaEntry.mobile.capture,
  );
});

test("mine é o default e mostra público mais o perfil autenticado", () => {
  const result = resolveTutorialVisibility(
    executableManifest(),
    authenticatedAccess(),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.view, { kind: "mine" });
  assert.deepEqual(ids(result.activeProfiles), ["reader"]);
  assert.deepEqual(ids(result.profileOptions), ["reader"]);
  assert.deepEqual(ids(result.topics), [
    "public-topic",
    "reader-topic",
    "shared-topic",
  ]);
  assert.deepEqual(ids(result.journeys), [
    "public-start",
    "reader-guide",
    "shared-guide",
  ]);
  assert.deepEqual(result.topics[0].journeyIds, [
    "public-start",
    "reader-guide",
  ]);
  assert.equal(
    result.topics[0].content.steps[0].media[0].desktop.capture.sha256,
    VALID_DESKTOP_SHA256,
  );
  assert.equal(
    result.topics[0].content.steps[0].media[0].mobile.capture.sha256,
    VALID_MOBILE_SHA256,
  );
  for (const topic of result.topics) {
    assert.equal(Object.hasOwn(topic, "audience"), false);
  }
  for (const journey of result.journeys) {
    assert.equal(Object.hasOwn(journey, "audience"), false);
  }
});

test("anonymous legítimo recebe somente conteúdo explicitamente público", () => {
  const result = resolveTutorialVisibility(executableManifest(), {
    kind: "anonymous",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.view, { kind: "mine" });
  assert.deepEqual(result.activeProfiles, []);
  assert.deepEqual(result.profileOptions, []);
  assert.deepEqual(ids(result.topics), ["public-topic"]);
  assert.deepEqual(ids(result.journeys), ["public-start"]);
  assert.deepEqual(result.topics[0].journeyIds, ["public-start"]);
  assert.equal(result.canPreviewAllProfiles, false);
});

test("authenticated sem perfis é sessão válida e recebe somente público", () => {
  const result = resolveTutorialVisibility(
    executableManifest(),
    authenticatedAccess({ authorizedProfileIds: [] }),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.activeProfiles, []);
  assert.deepEqual(result.profileOptions, []);
  assert.deepEqual(ids(result.topics), ["public-topic"]);
  assert.deepEqual(ids(result.journeys), ["public-start"]);
});

test("decisão invalid falha fechado e não equivale a anonymous", () => {
  const result = resolveTutorialVisibility(executableManifest(), {
    kind: "invalid",
  });

  assertFailure(result, "invalid-access");
});

test("authenticated sem perfis retorna sucesso vazio em app sem público", () => {
  const manifest = executableManifest();
  manifest.topics = manifest.topics.filter(
    (topic) => topic.audience.kind !== "public",
  );
  manifest.journeys = manifest.journeys.filter(
    (journey) => journey.audience.kind !== "public",
  );
  const remainingJourneyIds = new Set(
    manifest.journeys.map((journey) => journey.id),
  );
  manifest.topics = manifest.topics.map((topic) => ({
    ...topic,
    journeyIds: topic.journeyIds.filter((journeyId) =>
      remainingJourneyIds.has(journeyId),
    ),
  }));

  const result = resolveTutorialVisibility(
    manifest,
    authenticatedAccess({ authorizedProfileIds: [] }),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.topics, []);
  assert.deepEqual(result.journeys, []);
});

test("une dois perfis e mantém a ordem versionada do manifesto", () => {
  const result = resolveTutorialVisibility(
    executableManifest(),
    authenticatedAccess({
      authorizedProfileIds: ["reader", "editor"],
    }),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(ids(result.activeProfiles), ["reader", "editor"]);
  assert.deepEqual(ids(result.topics), [
    "editor-topic",
    "public-topic",
    "reader-topic",
    "shared-topic",
  ]);
  assert.deepEqual(ids(result.journeys), [
    "editor-guide",
    "public-start",
    "reader-guide",
    "shared-guide",
  ]);
});

test("ordem e duplicação dos IDs autorizados não alteram o resultado", () => {
  const manifest = executableManifest();
  const first = resolveTutorialVisibility(
    manifest,
    authenticatedAccess({
      authorizedProfileIds: ["editor", "reader", "editor"],
    }),
  );
  const second = resolveTutorialVisibility(
    manifest,
    authenticatedAccess({
      authorizedProfileIds: ["reader", "editor"],
    }),
  );

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.deepEqual(first, second);
});

test("capability ampla não expande mine implicitamente", () => {
  const result = resolveTutorialVisibility(
    executableManifest(),
    authenticatedAccess({ canPreviewAllProfiles: true }),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.view, { kind: "mine" });
  assert.deepEqual(ids(result.activeProfiles), ["reader"]);
  assert.deepEqual(ids(result.topics), [
    "public-topic",
    "reader-topic",
    "shared-topic",
  ]);
  assert.equal(result.canPreviewAllProfiles, true);
});

test("mine explícito produz exatamente o mesmo resultado do default", () => {
  const implicit = resolveTutorialVisibility(
    executableManifest(),
    authenticatedAccess(),
  );
  const explicit = resolveTutorialVisibility(
    executableManifest(),
    authenticatedAccess({ view: { kind: "mine" } }),
  );

  assert.equal(implicit.ok, true);
  assert.equal(explicit.ok, true);
  assert.deepEqual(explicit, implicit);
});

test("all-profiles sem capability falha fechado", () => {
  const result = resolveTutorialVisibility(
    executableManifest(),
    authenticatedAccess({ view: { kind: "all-profiles" } }),
  );

  assertFailure(result, "preview-forbidden");
});

test("preview sem capability não revela se o perfil existe", () => {
  const results = [];
  for (const profileId of ["reader", "perfil-secreto-inexistente"]) {
    const result = resolveTutorialVisibility(
      executableManifest(),
      authenticatedAccess({
        view: { kind: "preview-profile", profileId },
      }),
    );

    assertFailure(result, "preview-forbidden");
    results.push(result);
  }
  assert.deepEqual(results[0], results[1]);
});

test("preview sem capability não revela drift nos perfis autorizados", () => {
  const known = resolveTutorialVisibility(
    executableManifest(),
    authenticatedAccess({
      authorizedProfileIds: ["reader"],
      view: { kind: "all-profiles" },
    }),
  );
  const unknown = resolveTutorialVisibility(
    executableManifest(),
    authenticatedAccess({
      authorizedProfileIds: ["ghost"],
      view: { kind: "all-profiles" },
    }),
  );

  assertFailure(known, "preview-forbidden");
  assert.deepEqual(unknown, known);
});

test("anonymous e invalid não ganham canal lateral de preview", () => {
  const results = [];
  for (const profileId of ["reader", "perfil-secreto-inexistente"]) {
    for (const kind of ["anonymous", "invalid"]) {
      const result = resolveTutorialVisibility(executableManifest(), {
        kind,
        view: { kind: "preview-profile", profileId },
      });

      assertFailure(result, "invalid-access");
      results.push(result);
    }
  }
  for (const result of results.slice(1)) {
    assert.deepEqual(result, results[0]);
  }
});

test("preview autorizado usa só o perfil selecionado mais público", () => {
  const result = resolveTutorialVisibility(
    executableManifest(),
    authenticatedAccess({
      authorizedProfileIds: ["reader"],
      canPreviewAllProfiles: true,
      view: { kind: "preview-profile", profileId: "editor" },
    }),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.view, {
    kind: "preview-profile",
    profileId: "editor",
  });
  assert.deepEqual(ids(result.activeProfiles), ["editor"]);
  assert.deepEqual(ids(result.profileOptions), ["admin", "reader", "editor"]);
  assert.deepEqual(ids(result.topics), [
    "editor-topic",
    "public-topic",
    "shared-topic",
  ]);
  assert.deepEqual(ids(result.journeys), [
    "editor-guide",
    "public-start",
    "shared-guide",
  ]);
});

test("preview autorizado de perfil desconhecido falha sem fallback", () => {
  const result = resolveTutorialVisibility(
    executableManifest(),
    authenticatedAccess({
      canPreviewAllProfiles: true,
      view: { kind: "preview-profile", profileId: "ghost" },
    }),
  );

  assertFailure(result, "unknown-preview-profile");
});

test("all-profiles autorizado inclui todas as audiências na ordem do manifesto", () => {
  const result = resolveTutorialVisibility(
    executableManifest(),
    authenticatedAccess({
      authorizedProfileIds: [],
      canPreviewAllProfiles: true,
      view: { kind: "all-profiles" },
    }),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(ids(result.activeProfiles), ["admin", "reader", "editor"]);
  assert.deepEqual(ids(result.profileOptions), ["admin", "reader", "editor"]);
  assert.deepEqual(ids(result.topics), [
    "editor-topic",
    "public-topic",
    "reader-topic",
    "shared-topic",
    "admin-topic",
  ]);
  assert.deepEqual(ids(result.journeys), [
    "editor-guide",
    "public-start",
    "reader-guide",
    "shared-guide",
    "admin-guide",
    "public-orphan",
    "reader-orphan",
  ]);
});

test("ID autorizado desconhecido invalida toda a resolução", () => {
  const result = resolveTutorialVisibility(
    executableManifest(),
    authenticatedAccess({
      authorizedProfileIds: ["reader", "ghost"],
    }),
  );

  assertFailure(result, "invalid-access");
});

test("decisões de acesso malformadas retornam invalid-access sem lançar", () => {
  const invalidAccesses = [
    null,
    {},
    { kind: "anonymous", authorizedProfileIds: [] },
    { kind: "invalid", reason: "session-expired" },
    {
      kind: "authenticated",
      authorizedProfileIds: "reader",
      canPreviewAllProfiles: false,
    },
    {
      kind: "authenticated",
      authorizedProfileIds: [],
      canPreviewAllProfiles: "sim",
    },
    {
      kind: "authenticated",
      authorizedProfileIds: [""],
      canPreviewAllProfiles: false,
    },
    {
      kind: "authenticated",
      authorizedProfileIds: [],
      canPreviewAllProfiles: false,
      canPreviewAnyRole: true,
    },
  ];

  for (const invalidAccess of invalidAccesses) {
    const result = callWithoutThrow(
      () =>
        resolveTutorialVisibility(
          executableManifest(),
          invalidAccess,
        ),
      "acesso hostil não pode escapar como exceção",
    );
    assertFailure(result, "invalid-access");
  }
});

test("view malformada retorna invalid-view", () => {
  const invalidViews = [
    null,
    {},
    { kind: "desconhecida" },
    { kind: "preview-profile" },
    { kind: "preview-profile", profileId: "" },
    { kind: "mine", profileId: "reader" },
  ];

  for (const view of invalidViews) {
    const result = resolveTutorialVisibility(
      executableManifest(),
      authenticatedAccess({ view }),
    );
    assertFailure(result, "invalid-view");
  }
});

test("IDs duplicados no manifesto são rejeitados", () => {
  const mutations = [
    (manifest) => {
      manifest.profiles.push({ id: "reader", label: "Leitor duplicado" });
    },
    (manifest) => {
      manifest.topics.push({
        ...manifest.topics[0],
        content: topicDocument("topic-duplicado", "editor"),
      });
    },
    (manifest) => {
      manifest.journeys.push({
        ...manifest.journeys[0],
        content: journeyDocument("journey-duplicada"),
      });
    },
  ];

  for (const mutate of mutations) {
    const manifest = executableManifest();
    mutate(manifest);
    assertInvalidManifest(manifest);
  }
});

test("audiência profiles vazia, wildcard, duplicada ou desconhecida é inválida", () => {
  const invalidProfileIds = [
    [],
    ["*"],
    ["reader", "reader"],
    ["ghost"],
  ];

  for (const profileIds of invalidProfileIds) {
    const manifest = executableManifest();
    manifest.topics[0].audience = {
      kind: "profiles",
      profileIds,
    };
    assertInvalidManifest(manifest);
  }
});

test("referência de journey inexistente ou duplicada invalida o manifesto", () => {
  for (const journeyIds of [
    ["public-start", "ghost"],
    ["public-start", "public-start"],
  ]) {
    const manifest = executableManifest();
    manifest.topics[1].journeyIds = journeyIds;
    assertInvalidManifest(manifest);
  }
});

test("campos editoriais achatados no topo invalidam o schema executável", () => {
  const flattenedFields = [
    ["globalRoles", ["SUPER_ADMIN"]],
    ["appRoles", ["ADMIN"]],
    ["permissions", ["tutorial:read"]],
    ["scopes", ["igreja"]],
    ["visibility", { public: true }],
    ["effectiveWhen", { appRoles: ["ADMIN"] }],
  ];

  for (const [field, value] of flattenedFields) {
    const manifest = executableManifest();
    manifest[field] = value;
    assertInvalidManifest(manifest);
  }
});

test("manifestos editoriais e valores não executáveis são rejeitados", () => {
  const editorialManifest = {
    format: "maranata-tutorial-editorial-manifest",
    formatVersion: "1.0.0",
    app: { slug: "exemplo" },
    access: {
      roleInventory: [],
      previewAllProfiles: { allowedFor: ["SUPER_ADMIN"] },
    },
    profiles: [],
    topics: [],
    journeys: [],
  };

  assertInvalidManifest(editorialManifest);

  for (const value of [
    undefined,
    null,
    false,
    42,
    "tutorial-manifest.v1",
    [],
  ]) {
    assertInvalidManifest(value);
  }
});

test("journeys visíveis não referenciadas por tópico visível são removidas", () => {
  const anonymousResult = resolveTutorialVisibility(executableManifest(), {
    kind: "anonymous",
  });

  assert.equal(anonymousResult.ok, true);
  assert.equal(
    ids(anonymousResult.journeys).includes("public-orphan"),
    false,
  );

  const readerResult = resolveTutorialVisibility(
    executableManifest(),
    authenticatedAccess(),
  );
  assert.equal(readerResult.ok, true);
  assert.equal(
    ids(readerResult.journeys).includes("reader-orphan"),
    false,
  );
});

test("getter mutável de capability é rejeitado antes de poder escalar", () => {
  let reads = 0;
  const maliciousAccess = {
    kind: "authenticated",
    authorizedProfileIds: [],
    view: { kind: "all-profiles" },
    get canPreviewAllProfiles() {
      reads += 1;
      return reads > 1;
    },
  };

  const result = callWithoutThrow(
    () =>
      resolveTutorialVisibility(
        executableManifest(),
        maliciousAccess,
      ),
    "getter mutável de capability não pode lançar",
  );

  assertFailure(result, "invalid-access");
});

test("getter mutável de audience é rejeitado antes de expor tópico", () => {
  const manifest = executableManifest();
  const mediaEntry = manifest.topics[4].content.steps[0].media[0];
  for (const variant of [mediaEntry.desktop, mediaEntry.mobile]) {
    variant.exposure = "public-safe";
    variant.capture.profileId = null;
  }
  let reads = 0;
  Object.defineProperty(manifest.topics[4], "audience", {
    enumerable: true,
    configurable: true,
    get() {
      reads += 1;
      return reads === 1
        ? { kind: "profiles", profileIds: ["admin"] }
        : { kind: "public" };
    },
  });

  assertInvalidManifest(manifest);
});

test("getters que lançam falham fechado em manifesto e acesso", () => {
  for (const property of ["schemaVersion", "topics"]) {
    const manifest = executableManifest();
    Object.defineProperty(manifest, property, {
      enumerable: true,
      configurable: true,
      get() {
        throw new Error(`getter hostil de ${property}`);
      },
    });
    assertInvalidManifest(manifest);
  }

  const manifestWithHostileAudience = executableManifest();
  const hostileAudience = {};
  Object.defineProperty(hostileAudience, "kind", {
    enumerable: true,
    get() {
      throw new Error("getter hostil de audience.kind");
    },
  });
  manifestWithHostileAudience.topics[0].audience = hostileAudience;
  assertInvalidManifest(manifestWithHostileAudience);

  for (const property of ["kind", "authorizedProfileIds"]) {
    const hostileAccess = authenticatedAccess();
    Object.defineProperty(hostileAccess, property, {
      enumerable: true,
      configurable: true,
      get() {
        throw new Error(`getter hostil de access.${property}`);
      },
    });
    const result = callWithoutThrow(
      () =>
        resolveTutorialVisibility(
          executableManifest(),
          hostileAccess,
        ),
      "getter hostil do acesso não pode escapar",
    );
    assertFailure(result, "invalid-access");
  }
});

test("Proxies que lançam falham fechado em manifesto e acesso", () => {
  const throwingTraps = [
    ["getOwnPropertyDescriptor", () => {
      throw new Error("descriptor hostil");
    }],
    ["getPrototypeOf", () => {
      throw new Error("prototype hostil");
    }],
    ["ownKeys", () => {
      throw new Error("ownKeys hostil");
    }],
  ];

  for (const [trap, implementation] of throwingTraps) {
    const hostileManifest = new Proxy(executableManifest(), {
      [trap]: implementation,
    });
    assertInvalidManifest(hostileManifest);

    const hostileAccess = new Proxy(authenticatedAccess(), {
      [trap]: implementation,
    });
    const result = callWithoutThrow(
      () =>
        resolveTutorialVisibility(
          executableManifest(),
          hostileAccess,
        ),
      `Proxy com ${trap} hostil do acesso não pode escapar`,
    );
    assertFailure(result, "invalid-access");
  }

  const manifestWithNestedProxy = executableManifest();
  manifestWithNestedProxy.topics[0].content = new Proxy(
    manifestWithNestedProxy.topics[0].content,
    {
      getOwnPropertyDescriptor() {
        throw new Error("descriptor hostil aninhado");
      },
    },
  );
  assertInvalidManifest(manifestWithNestedProxy);
});

test("snapshot por descriptors não executa trap get de Proxy", () => {
  let getCalls = 0;
  const throwOnGet = {
    get() {
      getCalls += 1;
      throw new Error("get não deveria ser executado");
    },
  };
  const proxiedManifest = new Proxy(executableManifest(), throwOnGet);
  const proxiedAccess = new Proxy(authenticatedAccess(), throwOnGet);

  const validation = callWithoutThrow(
    () => validateTutorialManifest(proxiedManifest),
    "snapshot do manifesto não deve usar leitura dinâmica",
  );
  assert.equal(validation.ok, true);

  const result = callWithoutThrow(
    () => resolveTutorialVisibility(proxiedManifest, proxiedAccess),
    "snapshot do resolver não deve usar leitura dinâmica",
  );
  assert.equal(result.ok, true);
  assert.equal(getCalls, 0);
});

test("kind herdado nunca satisfaz discriminantes de confiança", () => {
  const manifest = executableManifest();
  const inheritedAudience = Object.create({ kind: "public" });
  manifest.topics[1].audience = inheritedAudience;
  assertInvalidManifest(manifest);

  const inheritedAccess = Object.create({ kind: "authenticated" });
  inheritedAccess.authorizedProfileIds = ["reader"];
  inheritedAccess.canPreviewAllProfiles = false;
  const result = resolveTutorialVisibility(
    executableManifest(),
    inheritedAccess,
  );
  assertFailure(result, "invalid-access");

  const inheritedView = Object.create({ kind: "all-profiles" });
  const inheritedViewResult = resolveTutorialVisibility(
    executableManifest(),
    authenticatedAccess({
      canPreviewAllProfiles: true,
      view: inheritedView,
    }),
  );
  assert.equal(inheritedViewResult.ok, false);
  assert.ok(
    ["invalid-access", "invalid-view"].includes(inheritedViewResult.code),
  );
  assert.deepEqual(
    Object.keys(inheritedViewResult).sort(),
    ["code", "ok"],
  );
});

test("profundidade e tamanho excessivos falham sem estouro de pilha", () => {
  const deeplyNestedManifest = executableManifest();
  let nested = "fim";
  for (
    let depth = 0;
    depth < TUTORIAL_INPUT_LIMITS.maxDepth + 2;
    depth += 1
  ) {
    nested = [nested];
  }
  deeplyNestedManifest.topics[0].content.steps = nested;
  assertInvalidManifest(deeplyNestedManifest);

  const maximumStringManifest = executableManifest();
  maximumStringManifest.topics[0].content.steps[0].body = "x".repeat(
    TUTORIAL_INPUT_LIMITS.maxStringLength,
  );
  assert.equal(
    validateTutorialManifest(maximumStringManifest).ok,
    true,
    "maxStringLength deve ser inclusivo",
  );

  const oversizedManifest = executableManifest();
  oversizedManifest.topics[0].content.steps[0].body = "x".repeat(
    TUTORIAL_INPUT_LIMITS.maxStringLength + 1,
  );
  assertInvalidManifest(oversizedManifest);

  const maximumArrayManifest = executableManifest();
  for (
    let index = maximumArrayManifest.profiles.length;
    index < TUTORIAL_INPUT_LIMITS.maxArrayLength;
    index += 1
  ) {
    maximumArrayManifest.profiles.push({
      id: `profile-${index}`,
      label: `Perfil ${index}`,
    });
  }
  assert.equal(
    validateTutorialManifest(maximumArrayManifest).ok,
    true,
    "maxArrayLength deve ser inclusivo com entradas válidas",
  );

  const oversizedArrayManifest = structuredClone(maximumArrayManifest);
  oversizedArrayManifest.profiles.push({
    id: "profile-over-limit",
    label: "Perfil além do limite",
  });
  assertInvalidManifest(oversizedArrayManifest);
});

test("conteúdo STANDARD de tópico malformado é rejeitado", () => {
  const mutations = [
    (content) => {
      content.title = 7;
    },
    (content) => {
      content.summary = null;
    },
    (content) => {
      content.steps = "não-é-array";
    },
    (content) => {
      delete content.steps[0].body;
    },
    (content) => {
      content.steps[0].unexpected = "segredo";
    },
    (content) => {
      content.steps[0].media = {};
    },
  ];

  for (const mutate of mutations) {
    const manifest = executableManifest();
    mutate(manifest.topics[0].content);
    assertInvalidManifest(manifest);
  }
});

test("conteúdo STANDARD de journey malformado é rejeitado", () => {
  const mutations = [
    (content) => {
      content.title = "";
    },
    (content) => {
      content.entryRoute = "dashboard-sem-barra";
    },
    (content) => {
      content.expectedResult = false;
    },
    (content) => {
      content.permissions = ["admin"];
    },
  ];

  for (const mutate of mutations) {
    const manifest = executableManifest();
    mutate(manifest.journeys[0].content);
    assertInvalidManifest(manifest);
  }
});

test("chaves extras em profile, media, capture e callout são rejeitadas", () => {
  const mutations = [
    (manifest) => {
      manifest.profiles[0].permissions = ["admin"];
    },
    (manifest) => {
      manifest.topics[0].content.steps[0].media[0].debug = true;
    },
    (manifest) => {
      manifest.topics[0].content.steps[0].media[0].desktop.debug = true;
    },
    (manifest) => {
      manifest.topics[0].content.steps[0].media[0].desktop.capture.session =
        "raw";
    },
    (manifest) => {
      manifest.topics[0].content.steps[0].media[0].mobile.callouts[0].href =
        "/admin";
    },
  ];

  for (const mutate of mutations) {
    const manifest = executableManifest();
    mutate(manifest);
    assertInvalidManifest(manifest);
  }
});

test("mobile é opcional, mas quando presente precisa ser uma variante completa", () => {
  const withoutMobile = executableManifest();
  delete withoutMobile.topics[0].content.steps[0].media[0].mobile;
  assert.equal(validateTutorialManifest(withoutMobile).ok, true);

  const malformedMutations = [
    (mediaEntry) => {
      mediaEntry.mobile = "mobile-inválido";
    },
    (mediaEntry) => {
      delete mediaEntry.mobile.capture;
    },
    (mediaEntry) => {
      mediaEntry.mobile.callouts = {};
    },
  ];

  for (const mutate of malformedMutations) {
    const manifest = executableManifest();
    mutate(manifest.topics[0].content.steps[0].media[0]);
    assertInvalidManifest(manifest);
  }
});

test("desktop ou mobile private em tópico public invalida o manifesto", () => {
  for (const variantName of ["desktop", "mobile"]) {
    const manifest = executableManifest();
    manifest.topics[1].content.steps[0].media[0][
      variantName
    ].exposure = "private";

    assertInvalidManifest(manifest);
  }
});

test("profileId de cada variante precisa pertencer à audiência do tópico", () => {
  for (const variantName of ["desktop", "mobile"]) {
    const publicManifest = executableManifest();
    publicManifest.topics[1].content.steps[0].media[0][
      variantName
    ].capture.profileId = "reader";
    assertInvalidManifest(publicManifest);

    const readerManifest = executableManifest();
    readerManifest.topics[2].content.steps[0].media[0][
      variantName
    ].capture.profileId = "admin";
    assertInvalidManifest(readerManifest);
  }
});

test("cada variante exige de 1 a 4 callouts", () => {
  for (const variantName of ["desktop", "mobile"]) {
    const noCalloutManifest = executableManifest();
    noCalloutManifest.topics[0].content.steps[0].media[0][
      variantName
    ].callouts = [];
    assertInvalidManifest(noCalloutManifest);

    const fiveCalloutsManifest = executableManifest();
    fiveCalloutsManifest.topics[0].content.steps[0].media[0][
      variantName
    ].callouts = Array.from({ length: 5 }, (_, index) =>
      callout(index + 1, {
        xPct: index * 15,
        yPct: 10,
        widthPct: 10,
        heightPct: 10,
      }),
    );
    assertInvalidManifest(fiveCalloutsManifest);

    const numberFiveManifest = executableManifest();
    numberFiveManifest.topics[0].content.steps[0].media[0][
      variantName
    ].callouts = [callout(5)];
    assertInvalidManifest(numberFiveManifest);
  }
});

test("desktop e mobile rejeitam HTTPS externo e data URL", () => {
  for (const variantName of ["desktop", "mobile"]) {
    for (const src of [
      "https://externo.example/tutorial.png",
      "data:image/png;base64,AAAA",
    ]) {
      const manifest = executableManifest();
      manifest.topics[0].content.steps[0].media[0][variantName].src = src;
      assertInvalidManifest(manifest);
    }
  }
});

test("ranges, hash e viewport inválidos são rejeitados", () => {
  const mutations = [
    (mediaEntry) => {
      mediaEntry.callouts[0].xPct = -0.01;
    },
    (mediaEntry) => {
      mediaEntry.callouts[0].yPct = 100.01;
    },
    (mediaEntry) => {
      mediaEntry.callouts[0].widthPct = 0;
    },
    (mediaEntry) => {
      mediaEntry.callouts[0].heightPct = 0;
    },
    (mediaEntry) => {
      mediaEntry.callouts[0].xPct = 80;
      mediaEntry.callouts[0].widthPct = 30;
    },
    (mediaEntry) => {
      mediaEntry.callouts[0].yPct = 90;
      mediaEntry.callouts[0].heightPct = 20;
    },
    (mediaEntry) => {
      mediaEntry.callouts[0].xPct = Number.NaN;
    },
    (mediaEntry) => {
      mediaEntry.callouts[0].heightPct = Number.POSITIVE_INFINITY;
    },
    (mediaEntry) => {
      mediaEntry.capture.sha256 = "não-é-sha256";
    },
    (mediaEntry) => {
      mediaEntry.capture.sha256 = "a".repeat(63);
    },
    (mediaEntry) => {
      mediaEntry.capture.sha256 = "a".repeat(65);
    },
    (mediaEntry) => {
      mediaEntry.capture.sha256 = "A".repeat(64);
    },
    (mediaEntry) => {
      mediaEntry.capture.sourceCommit = "zzzzzzz";
    },
    (mediaEntry) => {
      mediaEntry.capture.viewport.width = 0;
    },
    (mediaEntry) => {
      mediaEntry.capture.viewport.width = -1;
    },
    (mediaEntry) => {
      mediaEntry.capture.viewport.width = Number.NaN;
    },
    (mediaEntry) => {
      mediaEntry.capture.viewport.height = Number.POSITIVE_INFINITY;
    },
    (mediaEntry) => {
      mediaEntry.capture.viewport.devicePixelRatio = 0;
    },
    (mediaEntry) => {
      mediaEntry.capture.viewport.devicePixelRatio =
        Number.POSITIVE_INFINITY;
    },
    (mediaEntry) => {
      mediaEntry.capture.viewport.devicePixelRatio = 8.01;
    },
  ];

  for (const variantName of ["desktop", "mobile"]) {
    for (const mutate of mutations) {
      const manifest = executableManifest();
      mutate(
        manifest.topics[0].content.steps[0].media[0][variantName],
      );
      assertInvalidManifest(manifest);
    }
  }
});

test("resolver é determinístico e não muta inputs congelados", () => {
  const manifest = deepFreeze(executableManifest());
  const request = deepFreeze(
    authenticatedAccess({
      authorizedProfileIds: ["editor", "reader", "editor"],
      canPreviewAllProfiles: true,
    }),
  );
  const manifestSnapshot = structuredClone(manifest);
  const requestSnapshot = structuredClone(request);

  const first = resolveTutorialVisibility(manifest, request);
  const second = resolveTutorialVisibility(manifest, request);

  assert.equal(first.ok, true);
  assert.deepEqual(first, second);
  assert.deepEqual(manifest, manifestSnapshot);
  assert.deepEqual(request, requestSnapshot);
});
