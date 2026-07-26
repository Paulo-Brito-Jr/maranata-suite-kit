#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const FORMAT = "maranata-tutorial-editorial-manifest";
const VERSION = "1.0.0";
const MANIFEST_RELATIVE_PATH = "docs/tutorial/editorial-manifest.v1.json";
const CURRENT_STATES = new Set(["native-partial", "generic-link", "absent"]);
const EXPOSURES = new Set(["public", "authenticated", "mixed"]);
const CURRENT_EXPOSURES = new Set([...EXPOSURES, "absent"]);
const DISCOVERY_STATES = new Set([
  "present",
  "desktop-only",
  "mobile-only",
  "absent",
]);
const ROLE_SOURCES = new Set([
  "global",
  "app",
  "event",
  "runtime",
  "database",
  "claim",
  "policy",
]);
const CLASSIFICATIONS = new Set([
  "effective",
  "legacy-mapped",
  "reserved",
  "schema-only",
  "runtime-divergent",
]);
const CLAIM_STATES = new Set(["absent", "captured", "enforced"]);
const EVIDENCE_PATTERN = /:([1-9][0-9]*)(?:-([1-9][0-9]*))?$/;

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function uniqueIds(items, label, errors) {
  const ids = new Set();
  for (const item of items) {
    assert(isNonEmptyString(item?.id), `${label}: item sem id`, errors);
    if (!isNonEmptyString(item?.id)) continue;
    assert(!ids.has(item.id), `${label}: id duplicado "${item.id}"`, errors);
    ids.add(item.id);
  }
  return ids;
}

function validateEvidence(entries, label, errors) {
  assert(
    isStringArray(entries) && entries.length > 0,
    `${label}: informe ao menos uma evidência arquivo:linha`,
    errors,
  );
  if (!Array.isArray(entries)) return;
  for (const entry of entries) {
    assert(
      EVIDENCE_PATTERN.test(entry),
      `${label}: evidência sem linha válida "${entry}"`,
      errors,
    );
  }
}

function validateNoSensitiveContent(value, path, errors) {
  if (typeof value === "string") {
    const patterns = [
      {
        label: "e-mail",
        pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
      },
      {
        label: "CPF",
        pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,
      },
      {
        label: "telefone",
        pattern: /(?:\+?55\s*)?\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}\b/,
      },
      {
        label: "JWT",
        pattern: /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/,
      },
      {
        label: "chave de API",
        pattern: /\b(?:sk|pk|rk)_[A-Za-z0-9_-]{16,}\b/,
      },
    ];
    for (const { label, pattern } of patterns) {
      assert(
        !pattern.test(value),
        `${path}: possível ${label} real não pode constar no manifesto`,
        errors,
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateNoSensitiveContent(item, `${path}[${index}]`, errors),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, nestedValue] of Object.entries(value)) {
      validateNoSensitiveContent(nestedValue, `${path}.${key}`, errors);
    }
  }
}

function validateManifest(manifest, manifestPath) {
  const errors = [];

  validateNoSensitiveContent(manifest, "$", errors);

  assert(manifest?.format === FORMAT, `format deve ser "${FORMAT}"`, errors);
  assert(
    manifest?.formatVersion === VERSION,
    `formatVersion deve ser "${VERSION}"`,
    errors,
  );

  const app = manifest?.app;
  assert(isNonEmptyString(app?.slug), "app.slug é obrigatório", errors);
  assert(isNonEmptyString(app?.name), "app.name é obrigatório", errors);
  assert(
    isNonEmptyString(app?.repository),
    "app.repository é obrigatório",
    errors,
  );
  assert(
    isNonEmptyString(app?.productionUrl) &&
      /^https:\/\/[^/\s]+(?:\/.*)?$/.test(app.productionUrl),
    "app.productionUrl deve ser uma URL HTTPS",
    errors,
  );
  assert(
    CURRENT_STATES.has(app?.tutorial?.currentState),
    "app.tutorial.currentState inválido",
    errors,
  );
  assert(
    app?.tutorial?.currentRoute === null ||
      (isNonEmptyString(app?.tutorial?.currentRoute) &&
        (app.tutorial.currentRoute.startsWith("/") ||
          /^https:\/\/[^/\s]+(?:\/.*)?$/.test(app.tutorial.currentRoute))),
    "app.tutorial.currentRoute deve ser rota local, URL HTTPS ou null",
    errors,
  );
  assert(
    CURRENT_EXPOSURES.has(app?.tutorial?.currentExposure),
    "app.tutorial.currentExposure inválido",
    errors,
  );
  assert(
    app?.tutorial?.targetRoute === "/tutorial",
    'app.tutorial.targetRoute deve ser "/tutorial"',
    errors,
  );
  assert(
    EXPOSURES.has(app?.tutorial?.targetExposure),
    "app.tutorial.targetExposure inválido",
    errors,
  );
  if (app?.tutorial?.currentState === "absent") {
    assert(
      app.tutorial.currentRoute === null &&
        app.tutorial.currentExposure === "absent",
      "tutorial ausente exige currentRoute=null e currentExposure=absent",
      errors,
    );
  } else {
    assert(
      isNonEmptyString(app?.tutorial?.currentRoute) &&
        app.tutorial.currentExposure !== "absent",
      "tutorial existente/link exige currentRoute e currentExposure",
      errors,
    );
  }
  assert(
    DISCOVERY_STATES.has(app?.tutorial?.desktopDiscovery),
    "app.tutorial.desktopDiscovery inválido",
    errors,
  );
  assert(
    DISCOVERY_STATES.has(app?.tutorial?.mobileDiscovery),
    "app.tutorial.mobileDiscovery inválido",
    errors,
  );

  const audit = manifest?.audit;
  assert(
    audit?.status === "technical-audit",
    'audit.status deve ser "technical-audit"',
    errors,
  );
  assert(isNonEmptyString(audit?.owner), "audit.owner é obrigatório", errors);
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(audit?.reviewedAt ?? ""),
    "audit.reviewedAt deve usar YYYY-MM-DD",
    errors,
  );
  assert(
    /^[0-9a-f]{7,40}$/i.test(audit?.sourceCommit ?? ""),
    "audit.sourceCommit deve ser um hash Git",
    errors,
  );
  validateEvidence(audit?.evidence, "audit.evidence", errors);

  const roleInventory = manifest?.access?.roleInventory;
  assert(
    Array.isArray(roleInventory) && roleInventory.length > 0,
    "access.roleInventory não pode ser vazio",
    errors,
  );
  const roleKeys = new Set();
  const roleIds = new Set();
  const roleSourcesById = new Map();
  for (const role of Array.isArray(roleInventory) ? roleInventory : []) {
    assert(isNonEmptyString(role?.id), "roleInventory: item sem id", errors);
    assert(
      ROLE_SOURCES.has(role?.source),
      `roleInventory.${role?.id ?? "?"}: source inválido`,
      errors,
    );
    if (isNonEmptyString(role?.id) && ROLE_SOURCES.has(role?.source)) {
      const roleKey = `${role.source}:${role.id}`;
      assert(
        !roleKeys.has(roleKey),
        `roleInventory: papel duplicado "${roleKey}"`,
        errors,
      );
      roleKeys.add(roleKey);
      roleIds.add(role.id);
      const sources = roleSourcesById.get(role.id) ?? new Set();
      sources.add(role.source);
      roleSourcesById.set(role.id, sources);
    }
    assert(
      CLASSIFICATIONS.has(role?.classification),
      `roleInventory.${role?.id ?? "?"}: classification inválida`,
      errors,
    );
    validateEvidence(
      role?.evidence,
      `roleInventory.${role?.id ?? "?"}.evidence`,
      errors,
    );
  }

  const claims = manifest?.access?.claims;
  assert(Array.isArray(claims), "access.claims deve ser um array", errors);
  uniqueIds(Array.isArray(claims) ? claims : [], "claims", errors);
  for (const claim of Array.isArray(claims) ? claims : []) {
    assert(
      CLAIM_STATES.has(claim?.state),
      `claims.${claim?.id ?? "?"}: state inválido`,
      errors,
    );
    validateEvidence(
      claim?.evidence,
      `claims.${claim?.id ?? "?"}.evidence`,
      errors,
    );
  }

  const preview = manifest?.access?.previewAllProfiles;
  assert(
    Array.isArray(preview?.allowedFor) &&
      preview.allowedFor.length === 1 &&
      preview.allowedFor[0] === "SUPER_ADMIN",
    "previewAllProfiles.allowedFor deve conter somente SUPER_ADMIN",
    errors,
  );
  assert(
    preview?.developerDefault === false,
    "previewAllProfiles.developerDefault deve ser false",
    errors,
  );

  const profiles = Array.isArray(manifest?.profiles) ? manifest.profiles : [];
  const topics = Array.isArray(manifest?.topics) ? manifest.topics : [];
  const journeys = Array.isArray(manifest?.journeys) ? manifest.journeys : [];
  assert(profiles.length > 0, "profiles não pode ser vazio", errors);
  assert(topics.length > 0, "topics não pode ser vazio", errors);
  assert(journeys.length > 0, "journeys não pode ser vazio", errors);

  const profileIds = uniqueIds(profiles, "profiles", errors);
  const topicIds = uniqueIds(topics, "topics", errors);
  const journeyIds = uniqueIds(journeys, "journeys", errors);
  void topicIds;

  const journeyReferences = new Set();
  const topicProfileReferences = new Set();

  for (const profile of profiles) {
    assert(isNonEmptyString(profile?.label), `profile.${profile?.id}: label`, errors);
    assert(
      CLASSIFICATIONS.has(profile?.classification),
      `profile.${profile?.id}: classification inválida`,
      errors,
    );
    const when = profile?.effectiveWhen;
    for (const field of ["globalRoles", "appRoles", "permissions", "scopes"]) {
      assert(
        isStringArray(when?.[field]),
        `profile.${profile?.id}.effectiveWhen.${field} deve ser array de strings`,
        errors,
      );
    }
    for (const roleId of when?.globalRoles ?? []) {
      assert(
        roleIds.has(roleId),
        `profile.${profile?.id}.effectiveWhen.globalRoles: papel não inventariado "${roleId}"`,
        errors,
      );
      assert(
        roleSourcesById.get(roleId)?.has("global"),
        `profile.${profile?.id}.effectiveWhen.globalRoles: papel sem fonte global "${roleId}"`,
        errors,
      );
    }
    for (const roleId of when?.appRoles ?? []) {
      const sources = roleSourcesById.get(roleId);
      const hasAppSource = ["app", "event", "runtime", "database"].some(
        (source) => sources?.has(source),
      );
      assert(
        roleIds.has(roleId),
        `profile.${profile?.id}.effectiveWhen.appRoles: papel não inventariado "${roleId}"`,
        errors,
      );
      assert(
        hasAppSource,
        `profile.${profile?.id}.effectiveWhen.appRoles: papel sem fonte de app/runtime "${roleId}"`,
        errors,
      );
    }
    assert(
      isStringArray(profile?.capabilities),
      `profile.${profile?.id}.capabilities deve ser array`,
      errors,
    );
    assert(
      isStringArray(profile?.limits),
      `profile.${profile?.id}.limits deve ser array`,
      errors,
    );
    assert(
      isStringArray(profile?.journeyIds),
      `profile.${profile?.id}.journeyIds deve ser array`,
      errors,
    );
    validateEvidence(
      profile?.evidence,
      `profile.${profile?.id}.evidence`,
      errors,
    );

    if (profile?.classification === "effective") {
      assert(
        profile.capabilities?.length > 0,
        `profile.${profile.id}: perfil efetivo sem capacidade`,
        errors,
      );
      assert(
        profile.limits?.length > 0,
        `profile.${profile.id}: perfil efetivo sem limite`,
        errors,
      );
      assert(
        profile.journeyIds?.length > 0,
        `profile.${profile.id}: perfil efetivo sem jornada`,
        errors,
      );
    } else {
      assert(
        profile.journeyIds?.length === 0,
        `profile.${profile.id}: perfil não efetivo não pode prometer jornada`,
        errors,
      );
    }

    for (const journeyId of profile?.journeyIds ?? []) {
      assert(
        journeyIds.has(journeyId),
        `profile.${profile.id}: jornada inexistente "${journeyId}"`,
        errors,
      );
      const journey = journeys.find((item) => item.id === journeyId);
      assert(
        journey?.profileIds?.includes(profile.id),
        `profile.${profile.id}: jornada "${journeyId}" não referencia o perfil`,
        errors,
      );
      journeyReferences.add(journeyId);
    }
  }

  for (const topic of topics) {
    assert(isNonEmptyString(topic?.title), `topic.${topic?.id}: title`, errors);
    assert(
      isStringArray(topic?.profileIds) && topic.profileIds.length > 0,
      `topic.${topic?.id}: profileIds não pode ser vazio`,
      errors,
    );
    assert(
      isStringArray(topic?.journeyIds) && topic.journeyIds.length > 0,
      `topic.${topic?.id}: journeyIds não pode ser vazio`,
      errors,
    );
    const visibility = topic?.visibility;
    assert(
      typeof visibility?.public === "boolean",
      `topic.${topic?.id}: visibility.public deve ser boolean`,
      errors,
    );
    for (const field of ["globalRoles", "appRoles", "permissions", "scopes"]) {
      assert(
        isStringArray(visibility?.[field]),
        `topic.${topic?.id}.visibility.${field} deve ser array`,
        errors,
      );
    }
    for (const roleId of visibility?.globalRoles ?? []) {
      assert(
        roleIds.has(roleId),
        `topic.${topic?.id}.visibility.globalRoles: papel não inventariado "${roleId}"`,
        errors,
      );
      assert(
        roleSourcesById.get(roleId)?.has("global"),
        `topic.${topic?.id}.visibility.globalRoles: papel sem fonte global "${roleId}"`,
        errors,
      );
    }
    for (const roleId of visibility?.appRoles ?? []) {
      const sources = roleSourcesById.get(roleId);
      const hasAppSource = ["app", "event", "runtime", "database"].some(
        (source) => sources?.has(source),
      );
      assert(
        roleIds.has(roleId),
        `topic.${topic?.id}.visibility.appRoles: papel não inventariado "${roleId}"`,
        errors,
      );
      assert(
        hasAppSource,
        `topic.${topic?.id}.visibility.appRoles: papel sem fonte de app/runtime "${roleId}"`,
        errors,
      );
    }
    for (const profileId of topic?.profileIds ?? []) {
      assert(
        profileIds.has(profileId),
        `topic.${topic.id}: perfil inexistente "${profileId}"`,
        errors,
      );
      const profile = profiles.find((item) => item.id === profileId);
      assert(
        profile?.classification === "effective",
        `topic.${topic.id}: perfil não efetivo "${profileId}"`,
        errors,
      );
      topicProfileReferences.add(profileId);
    }
    for (const journeyId of topic?.journeyIds ?? []) {
      assert(
        journeyIds.has(journeyId),
        `topic.${topic.id}: jornada inexistente "${journeyId}"`,
        errors,
      );
      const journey = journeys.find((item) => item.id === journeyId);
      for (const profileId of journey?.profileIds ?? []) {
        assert(
          topic.profileIds?.includes(profileId),
          `topic.${topic.id}: jornada "${journeyId}" inclui perfil fora do tópico "${profileId}"`,
          errors,
        );
      }
      journeyReferences.add(journeyId);
    }
    for (const profileId of topic?.profileIds ?? []) {
      const hasJourneyForProfile = (topic?.journeyIds ?? []).some((journeyId) =>
        journeys
          .find((item) => item.id === journeyId)
          ?.profileIds?.includes(profileId),
      );
      assert(
        hasJourneyForProfile,
        `topic.${topic.id}: perfil "${profileId}" não participa das jornadas do tópico`,
        errors,
      );
    }
  }

  let desktopTotal = 0;
  let mobileTotal = 0;
  for (const journey of journeys) {
    assert(isNonEmptyString(journey?.title), `journey.${journey?.id}: title`, errors);
    assert(
      isStringArray(journey?.profileIds) && journey.profileIds.length > 0,
      `journey.${journey?.id}: profileIds não pode ser vazio`,
      errors,
    );
    for (const profileId of journey?.profileIds ?? []) {
      assert(
        profileIds.has(profileId),
        `journey.${journey.id}: perfil inexistente "${profileId}"`,
        errors,
      );
      const profile = profiles.find((item) => item.id === profileId);
      assert(
        profile?.classification === "effective",
        `journey.${journey.id}: perfil não efetivo "${profileId}"`,
        errors,
      );
      assert(
        profile?.journeyIds?.includes(journey.id),
        `journey.${journey.id}: profile.${profileId} não referencia a jornada`,
        errors,
      );
    }
    assert(
      isNonEmptyString(journey?.entry?.route) &&
        journey.entry.route.startsWith("/"),
      `journey.${journey?.id}: entry.route inválida`,
      errors,
    );
    assert(
      isStringArray(journey?.entry?.anchorCandidates) &&
        journey.entry.anchorCandidates.length > 0,
      `journey.${journey?.id}: anchorCandidates não pode ser vazio`,
      errors,
    );
    assert(
      isStringArray(journey?.entry?.preconditions) &&
        journey.entry.preconditions.length > 0,
      `journey.${journey?.id}: preconditions não pode ser vazio`,
      errors,
    );
    assert(
      isStringArray(journey?.actions) && journey.actions.length > 0,
      `journey.${journey?.id}: actions não pode ser vazio`,
      errors,
    );
    for (const field of ["expectedResult", "emptyState", "errorState"]) {
      assert(
        isNonEmptyString(journey?.[field]),
        `journey.${journey?.id}: ${field} é obrigatório`,
        errors,
      );
    }
    validateEvidence(
      journey?.authorizationEvidence,
      `journey.${journey?.id}.authorizationEvidence`,
      errors,
    );
    const desktop = journey?.visuals?.desktop;
    const mobile = journey?.visuals?.mobile;
    assert(
      Number.isInteger(desktop) && desktop >= 0,
      `journey.${journey?.id}: visuals.desktop inválido`,
      errors,
    );
    assert(
      Number.isInteger(mobile) && mobile >= 0,
      `journey.${journey?.id}: visuals.mobile inválido`,
      errors,
    );
    assert(
      isStringArray(journey?.visuals?.notes),
      `journey.${journey?.id}: visuals.notes deve ser array`,
      errors,
    );
    desktopTotal += Number.isInteger(desktop) ? desktop : 0;
    mobileTotal += Number.isInteger(mobile) ? mobile : 0;
  }

  for (const profile of profiles.filter(
    (item) => item.classification === "effective",
  )) {
    assert(
      topicProfileReferences.has(profile.id),
      `profile.${profile.id}: não aparece em tópico algum`,
      errors,
    );
  }
  for (const journeyId of journeyIds) {
    assert(
      journeyReferences.has(journeyId),
      `journey.${journeyId}: não referenciada por perfil ou tópico`,
      errors,
    );
  }

  assert(
    isStringArray(manifest?.content?.public),
    "content.public deve ser array",
    errors,
  );
  assert(
    isStringArray(manifest?.content?.authenticated),
    "content.authenticated deve ser array",
    errors,
  );
  const publicContentCount = Array.isArray(manifest?.content?.public)
    ? manifest.content.public.length
    : 0;
  const authenticatedContentCount = Array.isArray(
    manifest?.content?.authenticated,
  )
    ? manifest.content.authenticated.length
    : 0;
  assert(
    publicContentCount + authenticatedContentCount > 0,
    "content deve declarar conteúdo público e/ou autenticado",
    errors,
  );
  const expectedTargetExposure =
    publicContentCount > 0 && authenticatedContentCount > 0
      ? "mixed"
      : publicContentCount > 0
        ? "public"
        : "authenticated";
  assert(
    manifest?.app?.tutorial?.targetExposure === expectedTargetExposure,
    `app.tutorial.targetExposure deve ser "${expectedTargetExposure}" conforme content`,
    errors,
  );
  assert(
    Number.isInteger(manifest?.visualBudget?.desktop) &&
      manifest.visualBudget.desktop === desktopTotal,
    `visualBudget.desktop deve somar ${desktopTotal}`,
    errors,
  );
  assert(
    Number.isInteger(manifest?.visualBudget?.mobile) &&
      manifest.visualBudget.mobile === mobileTotal,
    `visualBudget.mobile deve somar ${mobileTotal}`,
    errors,
  );
  assert(
    Number.isInteger(manifest?.visualBudget?.total) &&
      manifest.visualBudget.total === desktopTotal + mobileTotal,
    `visualBudget.total deve somar ${desktopTotal + mobileTotal}`,
    errors,
  );
  assert(
    Array.isArray(manifest?.openQuestions) &&
      manifest.openQuestions.length === 0,
    "openQuestions deve estar vazio para o gate técnico",
    errors,
  );

  return { errors, manifestPath };
}

async function evidenceProblems(manifest, manifestPath) {
  const repositoryRoot = resolve(dirname(manifestPath), "../..");
  const entries = [
    ...(manifest.audit?.evidence ?? []),
    ...(manifest.access?.roleInventory ?? []).flatMap(
      (item) => item.evidence ?? [],
    ),
    ...(manifest.access?.claims ?? []).flatMap((item) => item.evidence ?? []),
    ...(manifest.profiles ?? []).flatMap((item) => item.evidence ?? []),
    ...(manifest.journeys ?? []).flatMap(
      (item) => item.authorizationEvidence ?? [],
    ),
  ];
  const problems = [];
  for (const entry of new Set(entries)) {
    const match = entry.match(EVIDENCE_PATTERN);
    if (!match || match.index === undefined) continue;
    const relativePath = entry.slice(0, match.index);
    const startLine = Number(match[1]);
    const endLine = match[2] ? Number(match[2]) : startLine;
    const evidencePath = resolve(repositoryRoot, relativePath);
    if (
      evidencePath !== repositoryRoot &&
      !evidencePath.startsWith(`${repositoryRoot}${sep}`)
    ) {
      problems.push(`evidência sai do repositório "${relativePath}"`);
      continue;
    }
    if (
      /(^|[/\\])\.env(?:[./\\]|$)/i.test(relativePath) ||
      /\.(?:pem|key|p12|pfx)$/i.test(relativePath)
    ) {
      problems.push(`evidência aponta para arquivo sensível "${relativePath}"`);
      continue;
    }
    try {
      await access(evidencePath);
      const source = await readFile(evidencePath, "utf8");
      const lineCount = source.split(/\r?\n/).length;
      if (startLine > endLine) {
        problems.push(
          `evidência possui intervalo invertido "${entry}"`,
        );
      } else if (endLine > lineCount) {
        problems.push(
          `evidência aponta para linha ${endLine}, mas "${relativePath}" possui ${lineCount}`,
        );
      }
    } catch {
      problems.push(`evidência aponta para arquivo ausente "${relativePath}"`);
    }
  }
  return problems;
}

async function main() {
  const requestedPaths = process.argv.slice(2);
  if (requestedPaths.length === 0) {
    console.error(
      `Uso: node ${fileURLToPath(import.meta.url)} <${MANIFEST_RELATIVE_PATH}> [...]`,
    );
    process.exitCode = 2;
    return;
  }

  let failed = false;
  for (const requestedPath of requestedPaths) {
    const manifestPath = resolve(requestedPath);
    let manifest;
    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    } catch (error) {
      failed = true;
      console.error(`FAIL ${manifestPath}`);
      console.error(`  JSON inválido ou ausente: ${error.message}`);
      continue;
    }

    const result = validateManifest(manifest, manifestPath);
    result.errors.push(...(await evidenceProblems(manifest, manifestPath)));

    if (result.errors.length > 0) {
      failed = true;
      console.error(`FAIL ${manifestPath}`);
      for (const error of result.errors) console.error(`  - ${error}`);
    } else {
      console.log(
        `OK ${manifest.app.slug}: ${manifest.profiles.length} perfis, ` +
          `${manifest.journeys.length} jornadas, ` +
          `${manifest.visualBudget.total} visuais`,
      );
    }
  }

  if (failed) process.exitCode = 1;
}

await main();
