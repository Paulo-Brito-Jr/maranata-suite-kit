import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, test } from "node:test";
import { spawnSync } from "node:child_process";

const scriptPath = fileURLToPath(
  new URL("./validate-tutorial-editorial-manifests.mjs", import.meta.url),
);
const temporaryRoots = [];

function validManifest() {
  return {
    format: "maranata-tutorial-editorial-manifest",
    formatVersion: "1.0.0",
    app: {
      slug: "exemplo",
      name: "Exemplo",
      repository: "Paulo-Brito-Jr/exemplo-maranata",
      productionUrl: "https://exemplo.maranata.app",
      tutorial: {
        currentState: "absent",
        currentRoute: null,
        currentExposure: "absent",
        targetRoute: "/tutorial",
        targetExposure: "authenticated",
        desktopDiscovery: "absent",
        mobileDiscovery: "absent",
      },
    },
    audit: {
      status: "technical-audit",
      owner: "Exemplo Maranata",
      reviewedAt: "2026-07-25",
      sourceCommit: "abcdef0",
      evidence: ["lib/auth.ts:1"],
    },
    access: {
      roleInventory: [
        {
          id: "ADMIN",
          source: "app",
          classification: "effective",
          evidence: ["lib/auth.ts:1"],
        },
      ],
      claims: [
        {
          id: "igreja",
          state: "enforced",
          evidence: ["lib/auth.ts:1"],
        },
      ],
      previewAllProfiles: {
        allowedFor: ["SUPER_ADMIN"],
        developerDefault: false,
      },
    },
    profiles: [
      {
        id: "admin",
        label: "Administrador",
        classification: "effective",
        effectiveWhen: {
          globalRoles: [],
          appRoles: ["ADMIN"],
          permissions: [],
          scopes: [],
        },
        capabilities: ["Administrar o exemplo"],
        limits: ["Não altera outros apps"],
        journeyIds: ["administrar-exemplo"],
        evidence: ["lib/auth.ts:1"],
      },
    ],
    topics: [
      {
        id: "administracao",
        title: "Administração",
        profileIds: ["admin"],
        visibility: {
          public: false,
          globalRoles: [],
          appRoles: ["ADMIN"],
          permissions: [],
          scopes: [],
        },
        journeyIds: ["administrar-exemplo"],
      },
    ],
    journeys: [
      {
        id: "administrar-exemplo",
        title: "Administrar o exemplo",
        profileIds: ["admin"],
        entry: {
          route: "/exemplo",
          anchorCandidates: ["exemplo-lista"],
          preconditions: ["Sessão ADMIN"],
        },
        actions: ["Abrir a lista"],
        expectedResult: "A lista aparece.",
        emptyState: "A lista orienta o primeiro cadastro.",
        errorState: "A interface fecha o acesso.",
        authorizationEvidence: ["lib/auth.ts:1"],
        visuals: {
          desktop: 1,
          mobile: 1,
          notes: ["Usar fixture sintética"],
        },
      },
    ],
    content: {
      public: [],
      authenticated: ["Administração"],
    },
    visualBudget: {
      desktop: 1,
      mobile: 1,
      total: 2,
    },
    openQuestions: [],
  };
}

async function createFixture(manifest) {
  const root = await mkdtemp(join(tmpdir(), "tutorial-manifest-"));
  temporaryRoots.push(root);
  const manifestPath = join(
    root,
    "docs",
    "tutorial",
    "editorial-manifest.v1.json",
  );
  await mkdir(dirname(manifestPath), { recursive: true });
  await mkdir(join(root, "lib"), { recursive: true });
  await writeFile(join(root, "lib", "auth.ts"), "export {};\n", "utf8");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifestPath;
}

function runValidator(manifestPath) {
  return spawnSync(process.execPath, [scriptPath, manifestPath], {
    encoding: "utf8",
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

test("aceita manifesto editorial íntegro", async () => {
  const manifestPath = await createFixture(validManifest());
  const result = runValidator(manifestPath);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OK exemplo: 1 perfis, 1 jornadas, 2 visuais/);
});

test("separa estado atual ausente da rota-alvo", async () => {
  const manifest = validManifest();
  manifest.app.tutorial.currentRoute = "/tutorial";
  manifest.app.tutorial.currentExposure = "authenticated";
  const manifestPath = await createFixture(manifest);
  const result = runValidator(manifestPath);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /tutorial ausente exige currentRoute=null e currentExposure=absent/,
  );
});

test("deriva a exposição-alvo do conteúdo declarado", async () => {
  const manifest = validManifest();
  manifest.content.public = ["Visão pública"];
  const manifestPath = await createFixture(manifest);
  const result = runValidator(manifestPath);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /app\.tutorial\.targetExposure deve ser "mixed" conforme content/,
  );
});

test("fecha preview amplo para DESENVOLVEDOR", async () => {
  const manifest = validManifest();
  manifest.access.previewAllProfiles.allowedFor.push("DESENVOLVEDOR");
  manifest.access.previewAllProfiles.developerDefault = true;
  const manifestPath = await createFixture(manifest);
  const result = runValidator(manifestPath);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /previewAllProfiles\.allowedFor deve conter somente SUPER_ADMIN/,
  );
  assert.match(
    result.stderr,
    /previewAllProfiles\.developerDefault deve ser false/,
  );
});

test("rejeita jornada prometida para papel não efetivo e orçamento divergente", async () => {
  const manifest = validManifest();
  manifest.profiles[0].classification = "schema-only";
  manifest.visualBudget.total = 99;
  const manifestPath = await createFixture(manifest);
  const result = runValidator(manifestPath);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /perfil não efetivo não pode prometer jornada/,
  );
  assert.match(result.stderr, /visualBudget\.total deve somar 2/);
});

test("rejeita evidência que aponta para arquivo ausente", async () => {
  const manifest = validManifest();
  manifest.journeys[0].authorizationEvidence = ["lib/inexistente.ts:9"];
  const manifestPath = await createFixture(manifest);
  const result = runValidator(manifestPath);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /evidência aponta para arquivo ausente "lib\/inexistente\.ts"/,
  );
});

test("rejeita evidência que aponta para linha inexistente", async () => {
  const manifest = validManifest();
  manifest.audit.evidence = ["lib/auth.ts:99"];
  const manifestPath = await createFixture(manifest);
  const result = runValidator(manifestPath);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /evidência aponta para linha 99, mas "lib\/auth\.ts" possui 2/,
  );
});

test("bloqueia path traversal em evidência", async () => {
  const manifest = validManifest();
  manifest.audit.evidence = ["../../.env:1"];
  const manifestPath = await createFixture(manifest);
  const result = runValidator(manifestPath);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /evidência sai do repositório "\.\.\/\.\.\/\.env"/);
});

test("bloqueia arquivo sensível como evidência", async () => {
  const manifest = validManifest();
  manifest.audit.evidence = ["private.pem:1"];
  const manifestPath = await createFixture(manifest);
  const result = runValidator(manifestPath);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /evidência aponta para arquivo sensível "private\.pem"/,
  );
});

test("rejeita intervalo de evidência invertido", async () => {
  const manifest = validManifest();
  manifest.audit.evidence = ["lib/auth.ts:2-1"];
  const manifestPath = await createFixture(manifest);
  const result = runValidator(manifestPath);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /evidência possui intervalo invertido "lib\/auth\.ts:2-1"/,
  );
});

test("rejeita dado pessoal no conteúdo editorial", async () => {
  const manifest = validManifest();
  manifest.journeys[0].actions.push("Localizar pessoa.real@exemplo.com");
  const manifestPath = await createFixture(manifest);
  const result = runValidator(manifestPath);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /possível e-mail real não pode constar no manifesto/,
  );
});

test("rejeita papel usado sem entrada no inventário", async () => {
  const manifest = validManifest();
  manifest.profiles[0].effectiveWhen.globalRoles = ["SUPER_ADMIN"];
  const manifestPath = await createFixture(manifest);
  const result = runValidator(manifestPath);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /papel não inventariado "SUPER_ADMIN"/,
  );
});

test("rejeita papel global inventariado somente como papel do app", async () => {
  const manifest = validManifest();
  manifest.profiles[0].effectiveWhen.globalRoles = ["ADMIN"];
  const manifestPath = await createFixture(manifest);
  const result = runValidator(manifestPath);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /papel sem fonte global "ADMIN"/,
  );
});

test("rejeita vínculo unilateral entre jornada e perfil", async () => {
  const manifest = validManifest();
  manifest.profiles[0].journeyIds = ["outra-jornada"];
  const manifestPath = await createFixture(manifest);
  const result = runValidator(manifestPath);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /profile\.admin: jornada inexistente "outra-jornada"/,
  );
  assert.match(
    result.stderr,
    /journey\.administrar-exemplo: profile\.admin não referencia a jornada/,
  );
});
