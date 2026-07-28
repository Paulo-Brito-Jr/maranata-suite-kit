/**
 * Contrato headless dos tutoriais da Suite Maranata.
 *
 * A fronteira de confiança fica no adapter server-side de cada app. Ele
 * interpreta sessão, papéis, permissões e claims e entrega uma decisão de
 * acesso explícita. Este módulo valida e projeta um manifesto canônico antes
 * de resolver visibilidade; objetos recebidos nunca são reutilizados.
 */

export const TUTORIAL_MANIFEST_SCHEMA_VERSION = "tutorial-manifest.v1";

export const TUTORIAL_INPUT_LIMITS = Object.freeze({
  maxDepth: 32,
  maxStringLength: 100_000,
  maxArrayLength: 5_000,
  maxObjectKeys: 64,
  maxNodes: 25_000,
  maxTotalStringLength: 2_000_000,
});

export type TutorialAudience =
  | {
      readonly kind: "public";
    }
  | {
      readonly kind: "profiles";
      readonly profileIds: readonly string[];
    };

export type TutorialProfile = {
  readonly id: string;
  readonly label: string;
};

export type TutorialCallout = {
  readonly number: number;
  readonly label: string;
  readonly description: string;
  readonly xPct: number;
  readonly yPct: number;
  readonly widthPct: number;
  readonly heightPct: number;
};

export type TutorialCaptureMetadata = {
  readonly route: string;
  readonly profileId: string | null;
  readonly viewport: {
    readonly width: number;
    readonly height: number;
    readonly devicePixelRatio?: number;
  };
  readonly theme: "light" | "dark" | "system";
  readonly locale: string;
  readonly timezone: string;
  readonly fixtureVersion: string;
  readonly sourceCommit: string;
  readonly sha256: string;
};

export type TutorialMediaVariant = {
  readonly src: string;
  readonly exposure: "private" | "public-safe";
  readonly callouts: readonly TutorialCallout[];
  readonly capture: TutorialCaptureMetadata;
};

export type TutorialMedia = {
  readonly id: string;
  readonly kind: "screenshot" | "crop" | "mockup" | "diagram";
  readonly alt: string;
  readonly caption: string;
  readonly longDescription: string;
  readonly desktop: TutorialMediaVariant;
  readonly mobile?: TutorialMediaVariant;
};

export type TutorialStep = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly expectedResult?: string;
  readonly media: readonly TutorialMedia[];
};

export type TutorialTopicDocument = {
  readonly title: string;
  readonly summary: string;
  readonly steps: readonly TutorialStep[];
};

export type TutorialJourneyDocument = {
  readonly title: string;
  readonly entryRoute: string;
  readonly expectedResult: string;
};

export type TutorialTopic = {
  readonly id: string;
  readonly audience: TutorialAudience;
  readonly journeyIds: readonly string[];
  readonly content: TutorialTopicDocument;
};

export type TutorialJourney = {
  readonly id: string;
  readonly audience: TutorialAudience;
  readonly content: TutorialJourneyDocument;
};

export type TutorialManifest = {
  readonly schemaVersion: typeof TUTORIAL_MANIFEST_SCHEMA_VERSION;
  readonly app: string;
  readonly version: string;
  readonly profiles: readonly TutorialProfile[];
  readonly topics: readonly TutorialTopic[];
  readonly journeys: readonly TutorialJourney[];
};

export type StandardTutorialManifest = TutorialManifest;

export type TutorialViewRequest =
  | {
      readonly kind: "mine";
    }
  | {
      readonly kind: "preview-profile";
      readonly profileId: string;
    }
  | {
      readonly kind: "all-profiles";
    };

export type TutorialAnonymousAccess = {
  /** Visitante legítimo de uma rota que admite conteúdo público. */
  readonly kind: "anonymous";
};

export type TutorialAuthenticatedAccess = {
  readonly kind: "authenticated";
  /**
   * IDs calculados pelo adapter server-side do app.
   *
   * Duplicatas são toleradas e normalizadas. Um ID ausente do manifesto
   * invalida toda a resolução para fechar drift de versão.
   */
  readonly authorizedProfileIds: readonly string[];
  /**
   * Capability separada do acesso ao app. O adapter só deve habilitá-la para
   * SUPER_ADMIN conforme a política canônica.
   */
  readonly canPreviewAllProfiles: boolean;
  /** Ausente equivale exclusivamente a `{ kind: "mine" }`. */
  readonly view?: TutorialViewRequest;
};

export type TutorialAccess =
  | TutorialAnonymousAccess
  | TutorialAuthenticatedAccess;

/**
 * `invalid` representa sessão/claims ausentes, expirados ou inconsistentes.
 * Ele nunca equivale a um visitante anônimo legítimo.
 */
export type TutorialAccessDecision =
  | TutorialAccess
  | {
      readonly kind: "invalid";
    };

export type TutorialAccessAdapter<TSession> = (
  session: TSession,
) => TutorialAccessDecision | Promise<TutorialAccessDecision>;

export type ResolvedTutorialTopic = {
  readonly id: string;
  readonly journeyIds: readonly string[];
  readonly content: TutorialTopicDocument;
};

export type ResolvedTutorialJourney = {
  readonly id: string;
  readonly content: TutorialJourneyDocument;
};

export type TutorialResolveSuccess = {
  readonly ok: true;
  readonly app: string;
  readonly version: string;
  readonly principal: "anonymous" | "authenticated";
  readonly view: TutorialViewRequest;
  readonly activeProfiles: readonly TutorialProfile[];
  readonly profileOptions: readonly TutorialProfile[];
  readonly topics: readonly ResolvedTutorialTopic[];
  readonly journeys: readonly ResolvedTutorialJourney[];
  readonly canPreviewAllProfiles: boolean;
};

export type TutorialResolveErrorCode =
  | "invalid-manifest"
  | "invalid-access"
  | "invalid-view"
  | "preview-forbidden"
  | "unknown-preview-profile";

export type TutorialResolveFailure = {
  readonly ok: false;
  readonly code: TutorialResolveErrorCode;
};

export type TutorialResolveResult =
  | TutorialResolveSuccess
  | TutorialResolveFailure;

export type TutorialManifestValidation =
  | {
      readonly ok: true;
      readonly manifest: StandardTutorialManifest;
    }
  | {
      readonly ok: false;
      readonly issues: readonly string[];
    };

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const APP_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SOURCE_COMMIT_PATTERN = /^[a-f0-9]{7,64}$/;
const ARRAY_INDEX_PATTERN = /^(0|[1-9][0-9]*)$/;
const MAX_VIEWPORT_SIZE = 16_384;
const MAX_DEVICE_PIXEL_RATIO = 8;

type ValidationBudget = {
  nodes: number;
  totalStringLength: number;
};

function createBudget(): ValidationBudget {
  return { nodes: 0, totalStringLength: 0 };
}

function consumeNode(
  budget: ValidationBudget,
  depth: number,
  path: string,
  issues: string[],
): boolean {
  if (depth > TUTORIAL_INPUT_LIMITS.maxDepth) {
    issues.push(`${path}: profundidade máxima excedida`);
    return false;
  }
  budget.nodes += 1;
  if (budget.nodes > TUTORIAL_INPUT_LIMITS.maxNodes) {
    issues.push(`${path}: limite total de nós excedido`);
    return false;
  }
  return true;
}

function snapshotRecord(
  raw: unknown,
  path: string,
  issues: string[],
  budget: ValidationBudget,
  depth: number,
): Record<string, unknown> | null {
  if (
    raw === null ||
    typeof raw !== "object" ||
    Array.isArray(raw)
  ) {
    issues.push(`${path}: objeto inválido`);
    return null;
  }
  if (!consumeNode(budget, depth, path, issues)) return null;

  const prototype = Object.getPrototypeOf(raw);
  if (prototype !== Object.prototype && prototype !== null) {
    issues.push(`${path}: protótipo não permitido`);
    return null;
  }

  const descriptors = Object.getOwnPropertyDescriptors(raw);
  const descriptorKeys = Reflect.ownKeys(descriptors);
  if (descriptorKeys.length > TUTORIAL_INPUT_LIMITS.maxObjectKeys) {
    issues.push(`${path}: limite de campos excedido`);
    return null;
  }
  const snapshot: Record<string, unknown> = Object.create(null);

  for (const key of descriptorKeys) {
    if (typeof key !== "string") {
      issues.push(`${path}: chave simbólica não permitida`);
      continue;
    }
    const descriptor = descriptors[key];
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.hasOwn(descriptor, "value")
    ) {
      issues.push(`${path}.${key}: accessor ou campo oculto não permitido`);
      continue;
    }
    snapshot[key] = descriptor.value;
  }

  return snapshot;
}

function snapshotArray(
  raw: unknown,
  path: string,
  issues: string[],
  budget: ValidationBudget,
  depth: number,
): unknown[] | null {
  if (!Array.isArray(raw)) {
    issues.push(`${path}: deve ser array`);
    return null;
  }
  if (!consumeNode(budget, depth, path, issues)) return null;

  const descriptors = Object.getOwnPropertyDescriptors(raw) as Record<
    string,
    PropertyDescriptor
  >;
  const lengthDescriptor = descriptors.length;
  if (
    lengthDescriptor === undefined ||
    !Object.hasOwn(lengthDescriptor, "value") ||
    typeof lengthDescriptor.value !== "number" ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0
  ) {
    issues.push(`${path}: array inválido`);
    return null;
  }
  const length = lengthDescriptor.value;
  if (length > TUTORIAL_INPUT_LIMITS.maxArrayLength) {
    issues.push(`${path}: tamanho máximo do array excedido`);
    return null;
  }

  const snapshot = new Array<unknown>(length);
  const seenIndexes = new Set<number>();
  for (const key of Reflect.ownKeys(descriptors)) {
    if (key === "length") continue;
    if (
      typeof key !== "string" ||
      !ARRAY_INDEX_PATTERN.test(key)
    ) {
      issues.push(`${path}: propriedade de array não permitida`);
      continue;
    }
    const index = Number(key);
    const descriptor = descriptors[key];
    if (
      index >= length ||
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.hasOwn(descriptor, "value")
    ) {
      issues.push(`${path}[${key}]: item inválido`);
      continue;
    }
    seenIndexes.add(index);
    snapshot[index] = descriptor.value;
  }
  if (seenIndexes.size !== length) {
    issues.push(`${path}: arrays esparsos não são permitidos`);
    return null;
  }
  return snapshot;
}

function validateExactKeys(
  record: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  path: string,
  issues: string[],
): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of required) {
    if (!Object.hasOwn(record, key)) {
      issues.push(`${path}.${key}: campo obrigatório`);
    }
  }
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      issues.push(`${path}.${key}: campo não permitido`);
    }
  }
}

function readString(
  value: unknown,
  path: string,
  issues: string[],
  budget: ValidationBudget,
  options: {
    nonEmpty?: boolean;
    pattern?: RegExp;
  } = {},
): string | null {
  if (typeof value !== "string") {
    issues.push(`${path}: deve ser texto`);
    return null;
  }
  if (
    value.length > TUTORIAL_INPUT_LIMITS.maxStringLength ||
    budget.totalStringLength + value.length >
      TUTORIAL_INPUT_LIMITS.maxTotalStringLength
  ) {
    issues.push(`${path}: limite de texto excedido`);
    return null;
  }
  budget.totalStringLength += value.length;
  if (options.nonEmpty !== false && value.trim().length === 0) {
    issues.push(`${path}: texto obrigatório`);
    return null;
  }
  if (options.pattern && !options.pattern.test(value)) {
    issues.push(`${path}: formato inválido`);
    return null;
  }
  return value;
}

function readStableId(
  value: unknown,
  path: string,
  issues: string[],
  budget: ValidationBudget,
): string | null {
  return readString(value, path, issues, budget, { pattern: ID_PATTERN });
}

function readRoute(
  value: unknown,
  path: string,
  issues: string[],
  budget: ValidationBudget,
): string | null {
  const route = readString(value, path, issues, budget);
  if (
    route !== null &&
    (!route.startsWith("/") ||
      route.startsWith("//") ||
      route.includes("\\") ||
      route.includes("\0"))
  ) {
    issues.push(`${path}: rota interna inválida`);
    return null;
  }
  return route;
}

function readMediaSource(
  value: unknown,
  path: string,
  issues: string[],
  budget: ValidationBudget,
): string | null {
  const source = readString(value, path, issues, budget);
  if (source === null) return null;
  const isInternal =
    source.startsWith("/") &&
    !source.startsWith("//") &&
    !source.includes("\\") &&
    !source.includes("\0");
  if (!isInternal) {
    issues.push(`${path}: use um caminho interno de mídia`);
    return null;
  }
  return source;
}

function readFiniteNumber(
  value: unknown,
  path: string,
  issues: string[],
  options: {
    min?: number;
    max?: number;
    exclusiveMin?: boolean;
    integer?: boolean;
  } = {},
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (options.integer === true && !Number.isInteger(value)) ||
    (options.min !== undefined &&
      (options.exclusiveMin === true
        ? value <= options.min
        : value < options.min)) ||
    (options.max !== undefined && value > options.max)
  ) {
    issues.push(`${path}: número inválido`);
    return null;
  }
  return value;
}

function parseUniqueStableIds(
  raw: unknown,
  path: string,
  issues: string[],
  budget: ValidationBudget,
  depth: number,
  allowEmpty: boolean,
): string[] | null {
  const array = snapshotArray(raw, path, issues, budget, depth);
  if (array === null) return null;
  if (!allowEmpty && array.length === 0) {
    issues.push(`${path}: não pode ser vazio`);
  }
  const values: string[] = [];
  const seen = new Set<string>();
  array.forEach((value, index) => {
    const id = readStableId(value, `${path}[${index}]`, issues, budget);
    if (id === null) return;
    if (seen.has(id)) {
      issues.push(`${path}[${index}]: ID duplicado`);
      return;
    }
    seen.add(id);
    values.push(id);
  });
  return values;
}

function parseAudience(
  raw: unknown,
  path: string,
  profileIds: ReadonlySet<string>,
  issues: string[],
  budget: ValidationBudget,
  depth: number,
): TutorialAudience | null {
  const record = snapshotRecord(raw, path, issues, budget, depth);
  if (record === null) return null;
  if (!Object.hasOwn(record, "kind")) {
    issues.push(`${path}.kind: campo obrigatório`);
    return null;
  }
  if (record.kind === "public") {
    validateExactKeys(record, ["kind"], [], path, issues);
    return { kind: "public" };
  }
  if (record.kind !== "profiles") {
    issues.push(`${path}.kind: use "public" ou "profiles"`);
    return null;
  }
  validateExactKeys(record, ["kind", "profileIds"], [], path, issues);
  const ids = parseUniqueStableIds(
    record.profileIds,
    `${path}.profileIds`,
    issues,
    budget,
    depth + 1,
    false,
  );
  for (const id of ids ?? []) {
    if (!profileIds.has(id)) {
      issues.push(`${path}.profileIds: perfil desconhecido`);
    }
  }
  return ids === null ? null : { kind: "profiles", profileIds: ids };
}

function parseViewport(
  raw: unknown,
  path: string,
  issues: string[],
  budget: ValidationBudget,
  depth: number,
): TutorialCaptureMetadata["viewport"] | null {
  const record = snapshotRecord(raw, path, issues, budget, depth);
  if (record === null) return null;
  validateExactKeys(
    record,
    ["width", "height"],
    ["devicePixelRatio"],
    path,
    issues,
  );
  const width = readFiniteNumber(record.width, `${path}.width`, issues, {
    min: 0,
    exclusiveMin: true,
    max: MAX_VIEWPORT_SIZE,
    integer: true,
  });
  const height = readFiniteNumber(record.height, `${path}.height`, issues, {
    min: 0,
    exclusiveMin: true,
    max: MAX_VIEWPORT_SIZE,
    integer: true,
  });
  let devicePixelRatio: number | undefined;
  if (Object.hasOwn(record, "devicePixelRatio")) {
    devicePixelRatio =
      readFiniteNumber(
        record.devicePixelRatio,
        `${path}.devicePixelRatio`,
        issues,
        {
          min: 0,
          exclusiveMin: true,
          max: MAX_DEVICE_PIXEL_RATIO,
        },
      ) ?? undefined;
  }
  if (width === null || height === null) return null;
  return devicePixelRatio === undefined
    ? { width, height }
    : { width, height, devicePixelRatio };
}

function parseCapture(
  raw: unknown,
  path: string,
  profileIds: ReadonlySet<string>,
  issues: string[],
  budget: ValidationBudget,
  depth: number,
): TutorialCaptureMetadata | null {
  const record = snapshotRecord(raw, path, issues, budget, depth);
  if (record === null) return null;
  validateExactKeys(
    record,
    [
      "route",
      "profileId",
      "viewport",
      "theme",
      "locale",
      "timezone",
      "fixtureVersion",
      "sourceCommit",
      "sha256",
    ],
    [],
    path,
    issues,
  );

  const route = readRoute(record.route, `${path}.route`, issues, budget);
  let profileId: string | null = null;
  if (record.profileId !== null) {
    profileId = readStableId(
      record.profileId,
      `${path}.profileId`,
      issues,
      budget,
    );
    if (profileId !== null && !profileIds.has(profileId)) {
      issues.push(`${path}.profileId: perfil desconhecido`);
      profileId = null;
    }
  }
  const viewport = parseViewport(
    record.viewport,
    `${path}.viewport`,
    issues,
    budget,
    depth + 1,
  );
  const theme =
    record.theme === "light" ||
    record.theme === "dark" ||
    record.theme === "system"
      ? record.theme
      : null;
  if (theme === null) issues.push(`${path}.theme: tema inválido`);
  const locale = readString(record.locale, `${path}.locale`, issues, budget);
  const timezone = readString(
    record.timezone,
    `${path}.timezone`,
    issues,
    budget,
  );
  const fixtureVersion = readString(
    record.fixtureVersion,
    `${path}.fixtureVersion`,
    issues,
    budget,
    { pattern: VERSION_PATTERN },
  );
  const sourceCommit = readString(
    record.sourceCommit,
    `${path}.sourceCommit`,
    issues,
    budget,
    { pattern: SOURCE_COMMIT_PATTERN },
  );
  const sha256 = readString(
    record.sha256,
    `${path}.sha256`,
    issues,
    budget,
    { pattern: SHA256_PATTERN },
  );

  if (
    route === null ||
    viewport === null ||
    theme === null ||
    locale === null ||
    timezone === null ||
    fixtureVersion === null ||
    sourceCommit === null ||
    sha256 === null ||
    (record.profileId !== null && profileId === null)
  ) {
    return null;
  }
  return {
    route,
    profileId,
    viewport,
    theme,
    locale,
    timezone,
    fixtureVersion,
    sourceCommit,
    sha256,
  };
}

function parseCallout(
  raw: unknown,
  path: string,
  issues: string[],
  budget: ValidationBudget,
  depth: number,
): TutorialCallout | null {
  const record = snapshotRecord(raw, path, issues, budget, depth);
  if (record === null) return null;
  validateExactKeys(
    record,
    [
      "number",
      "label",
      "description",
      "xPct",
      "yPct",
      "widthPct",
      "heightPct",
    ],
    [],
    path,
    issues,
  );
  const number = readFiniteNumber(record.number, `${path}.number`, issues, {
    min: 0,
    exclusiveMin: true,
    max: 4,
    integer: true,
  });
  const label = readString(record.label, `${path}.label`, issues, budget);
  const description = readString(
    record.description,
    `${path}.description`,
    issues,
    budget,
  );
  const xPct = readFiniteNumber(record.xPct, `${path}.xPct`, issues, {
    min: 0,
    max: 100,
  });
  const yPct = readFiniteNumber(record.yPct, `${path}.yPct`, issues, {
    min: 0,
    max: 100,
  });
  const widthPct = readFiniteNumber(
    record.widthPct,
    `${path}.widthPct`,
    issues,
    { min: 0, exclusiveMin: true, max: 100 },
  );
  const heightPct = readFiniteNumber(
    record.heightPct,
    `${path}.heightPct`,
    issues,
    { min: 0, exclusiveMin: true, max: 100 },
  );
  if (
    xPct !== null &&
    widthPct !== null &&
    xPct + widthPct > 100
  ) {
    issues.push(`${path}: callout ultrapassa a largura da imagem`);
  }
  if (
    yPct !== null &&
    heightPct !== null &&
    yPct + heightPct > 100
  ) {
    issues.push(`${path}: callout ultrapassa a altura da imagem`);
  }
  if (
    number === null ||
    label === null ||
    description === null ||
    xPct === null ||
    yPct === null ||
    widthPct === null ||
    heightPct === null ||
    xPct + widthPct > 100 ||
    yPct + heightPct > 100
  ) {
    return null;
  }
  return {
    number,
    label,
    description,
    xPct,
    yPct,
    widthPct,
    heightPct,
  };
}

function parseMediaVariant(
  raw: unknown,
  path: string,
  profileIds: ReadonlySet<string>,
  audience: TutorialAudience,
  issues: string[],
  budget: ValidationBudget,
  depth: number,
): TutorialMediaVariant | null {
  const record = snapshotRecord(raw, path, issues, budget, depth);
  if (record === null) return null;
  validateExactKeys(
    record,
    ["src", "exposure", "callouts", "capture"],
    [],
    path,
    issues,
  );
  const src = readMediaSource(record.src, `${path}.src`, issues, budget);
  const exposure =
    record.exposure === "private" || record.exposure === "public-safe"
      ? record.exposure
      : null;
  if (exposure === null) {
    issues.push(`${path}.exposure: exposição inválida`);
  } else if (audience.kind === "public" && exposure !== "public-safe") {
    issues.push(`${path}.exposure: tópico público exige "public-safe"`);
  }

  const calloutValues = snapshotArray(
    record.callouts,
    `${path}.callouts`,
    issues,
    budget,
    depth + 1,
  );
  if (
    calloutValues !== null &&
    (calloutValues.length < 1 || calloutValues.length > 4)
  ) {
    issues.push(`${path}.callouts: use entre 1 e 4 marcações`);
  }
  const callouts: TutorialCallout[] = [];
  const calloutNumbers = new Set<number>();
  calloutValues?.forEach((value, index) => {
    const callout = parseCallout(
      value,
      `${path}.callouts[${index}]`,
      issues,
      budget,
      depth + 2,
    );
    if (callout === null) return;
    if (calloutNumbers.has(callout.number)) {
      issues.push(`${path}.callouts[${index}].number: número duplicado`);
      return;
    }
    calloutNumbers.add(callout.number);
    callouts.push(callout);
  });
  const capture = parseCapture(
    record.capture,
    `${path}.capture`,
    profileIds,
    issues,
    budget,
    depth + 1,
  );
  if (
    capture !== null &&
    audience.kind === "public" &&
    capture.profileId !== null
  ) {
    issues.push(`${path}.capture.profileId: tópico público exige null`);
  }
  if (
    capture !== null &&
    audience.kind === "profiles" &&
    capture.profileId !== null &&
    !audience.profileIds.includes(capture.profileId)
  ) {
    issues.push(
      `${path}.capture.profileId: perfil fora da audiência do tópico`,
    );
  }

  if (
    src === null ||
    exposure === null ||
    (audience.kind === "public" && exposure !== "public-safe") ||
    calloutValues === null ||
    calloutValues.length < 1 ||
    calloutValues.length > 4 ||
    capture === null ||
    (audience.kind === "public" && capture.profileId !== null) ||
    (audience.kind === "profiles" &&
      capture.profileId !== null &&
      !audience.profileIds.includes(capture.profileId))
  ) {
    return null;
  }
  return {
    src,
    exposure,
    callouts,
    capture,
  };
}

function parseMedia(
  raw: unknown,
  path: string,
  profileIds: ReadonlySet<string>,
  audience: TutorialAudience,
  issues: string[],
  budget: ValidationBudget,
  depth: number,
): TutorialMedia | null {
  const record = snapshotRecord(raw, path, issues, budget, depth);
  if (record === null) return null;
  validateExactKeys(
    record,
    ["id", "kind", "alt", "caption", "longDescription", "desktop"],
    ["mobile"],
    path,
    issues,
  );
  const id = readStableId(record.id, `${path}.id`, issues, budget);
  const kind =
    record.kind === "screenshot" ||
    record.kind === "crop" ||
    record.kind === "mockup" ||
    record.kind === "diagram"
      ? record.kind
      : null;
  if (kind === null) issues.push(`${path}.kind: tipo de mídia inválido`);
  const alt = readString(record.alt, `${path}.alt`, issues, budget);
  const caption = readString(
    record.caption,
    `${path}.caption`,
    issues,
    budget,
  );
  const longDescription = readString(
    record.longDescription,
    `${path}.longDescription`,
    issues,
    budget,
  );
  const desktop = parseMediaVariant(
    record.desktop,
    `${path}.desktop`,
    profileIds,
    audience,
    issues,
    budget,
    depth + 1,
  );
  let mobile: TutorialMediaVariant | undefined;
  if (Object.hasOwn(record, "mobile")) {
    mobile =
      parseMediaVariant(
        record.mobile,
        `${path}.mobile`,
        profileIds,
        audience,
        issues,
        budget,
        depth + 1,
      ) ?? undefined;
  }
  if (
    id === null ||
    kind === null ||
    alt === null ||
    caption === null ||
    longDescription === null ||
    desktop === null ||
    (Object.hasOwn(record, "mobile") && mobile === undefined)
  ) {
    return null;
  }
  return {
    id,
    kind,
    alt,
    caption,
    longDescription,
    desktop,
    ...(mobile === undefined ? {} : { mobile }),
  };
}

function parseStep(
  raw: unknown,
  path: string,
  profileIds: ReadonlySet<string>,
  audience: TutorialAudience,
  mediaIds: Set<string>,
  issues: string[],
  budget: ValidationBudget,
  depth: number,
): TutorialStep | null {
  const record = snapshotRecord(raw, path, issues, budget, depth);
  if (record === null) return null;
  validateExactKeys(
    record,
    ["id", "title", "body", "media"],
    ["expectedResult"],
    path,
    issues,
  );
  const id = readStableId(record.id, `${path}.id`, issues, budget);
  const title = readString(record.title, `${path}.title`, issues, budget);
  const body = readString(record.body, `${path}.body`, issues, budget);
  let expectedResult: string | undefined;
  if (Object.hasOwn(record, "expectedResult")) {
    expectedResult =
      readString(
        record.expectedResult,
        `${path}.expectedResult`,
        issues,
        budget,
      ) ?? undefined;
  }
  const mediaValues = snapshotArray(
    record.media,
    `${path}.media`,
    issues,
    budget,
    depth + 1,
  );
  const media: TutorialMedia[] = [];
  mediaValues?.forEach((value, index) => {
    const entry = parseMedia(
      value,
      `${path}.media[${index}]`,
      profileIds,
      audience,
      issues,
      budget,
      depth + 2,
    );
    if (entry === null) return;
    if (mediaIds.has(entry.id)) {
      issues.push(`${path}.media[${index}].id: ID duplicado`);
      return;
    }
    mediaIds.add(entry.id);
    media.push(entry);
  });
  if (
    id === null ||
    title === null ||
    body === null ||
    mediaValues === null ||
    (Object.hasOwn(record, "expectedResult") &&
      expectedResult === undefined)
  ) {
    return null;
  }
  return {
    id,
    title,
    body,
    ...(expectedResult === undefined ? {} : { expectedResult }),
    media,
  };
}

function parseTopicDocument(
  raw: unknown,
  path: string,
  profileIds: ReadonlySet<string>,
  audience: TutorialAudience,
  stepIds: Set<string>,
  mediaIds: Set<string>,
  issues: string[],
  budget: ValidationBudget,
  depth: number,
): TutorialTopicDocument | null {
  const record = snapshotRecord(raw, path, issues, budget, depth);
  if (record === null) return null;
  validateExactKeys(record, ["title", "summary", "steps"], [], path, issues);
  const title = readString(record.title, `${path}.title`, issues, budget);
  const summary = readString(
    record.summary,
    `${path}.summary`,
    issues,
    budget,
  );
  const stepValues = snapshotArray(
    record.steps,
    `${path}.steps`,
    issues,
    budget,
    depth + 1,
  );
  if (stepValues !== null && stepValues.length === 0) {
    issues.push(`${path}.steps: não pode ser vazio`);
  }
  const steps: TutorialStep[] = [];
  stepValues?.forEach((value, index) => {
    const step = parseStep(
      value,
      `${path}.steps[${index}]`,
      profileIds,
      audience,
      mediaIds,
      issues,
      budget,
      depth + 2,
    );
    if (step === null) return;
    if (stepIds.has(step.id)) {
      issues.push(`${path}.steps[${index}].id: ID duplicado`);
      return;
    }
    stepIds.add(step.id);
    steps.push(step);
  });
  if (
    title === null ||
    summary === null ||
    stepValues === null ||
    stepValues.length === 0
  ) {
    return null;
  }
  return { title, summary, steps };
}

function parseJourneyDocument(
  raw: unknown,
  path: string,
  issues: string[],
  budget: ValidationBudget,
  depth: number,
): TutorialJourneyDocument | null {
  const record = snapshotRecord(raw, path, issues, budget, depth);
  if (record === null) return null;
  validateExactKeys(
    record,
    ["title", "entryRoute", "expectedResult"],
    [],
    path,
    issues,
  );
  const title = readString(record.title, `${path}.title`, issues, budget);
  const entryRoute = readRoute(
    record.entryRoute,
    `${path}.entryRoute`,
    issues,
    budget,
  );
  const expectedResult = readString(
    record.expectedResult,
    `${path}.expectedResult`,
    issues,
    budget,
  );
  if (
    title === null ||
    entryRoute === null ||
    expectedResult === null
  ) {
    return null;
  }
  return { title, entryRoute, expectedResult };
}

function validateTutorialManifestUnsafe(
  raw: unknown,
): TutorialManifestValidation {
  const issues: string[] = [];
  const budget = createBudget();
  const record = snapshotRecord(raw, "$", issues, budget, 0);
  if (record === null) return { ok: false, issues };
  validateExactKeys(
    record,
    ["schemaVersion", "app", "version", "profiles", "topics", "journeys"],
    [],
    "$",
    issues,
  );

  if (record.schemaVersion !== TUTORIAL_MANIFEST_SCHEMA_VERSION) {
    issues.push(
      `$.schemaVersion: deve ser "${TUTORIAL_MANIFEST_SCHEMA_VERSION}"`,
    );
  }
  const app = readString(record.app, "$.app", issues, budget, {
    pattern: APP_PATTERN,
  });
  const version = readString(record.version, "$.version", issues, budget, {
    pattern: VERSION_PATTERN,
  });

  const profileValues = snapshotArray(
    record.profiles,
    "$.profiles",
    issues,
    budget,
    1,
  );
  if (profileValues !== null && profileValues.length === 0) {
    issues.push("$.profiles: não pode ser vazio");
  }
  const profiles: TutorialProfile[] = [];
  const profileIds = new Set<string>();
  profileValues?.forEach((value, index) => {
    const path = `$.profiles[${index}]`;
    const profile = snapshotRecord(value, path, issues, budget, 2);
    if (profile === null) return;
    validateExactKeys(profile, ["id", "label"], [], path, issues);
    const id = readStableId(profile.id, `${path}.id`, issues, budget);
    const label = readString(profile.label, `${path}.label`, issues, budget);
    if (id === null || label === null) return;
    if (profileIds.has(id)) {
      issues.push(`${path}.id: ID duplicado`);
      return;
    }
    profileIds.add(id);
    profiles.push({ id, label });
  });

  const journeyValues = snapshotArray(
    record.journeys,
    "$.journeys",
    issues,
    budget,
    1,
  );
  if (journeyValues !== null && journeyValues.length === 0) {
    issues.push("$.journeys: não pode ser vazio");
  }
  const journeys: TutorialJourney[] = [];
  const journeyIds = new Set<string>();
  journeyValues?.forEach((value, index) => {
    const path = `$.journeys[${index}]`;
    const journey = snapshotRecord(value, path, issues, budget, 2);
    if (journey === null) return;
    validateExactKeys(
      journey,
      ["id", "audience", "content"],
      [],
      path,
      issues,
    );
    const id = readStableId(journey.id, `${path}.id`, issues, budget);
    const audience = parseAudience(
      journey.audience,
      `${path}.audience`,
      profileIds,
      issues,
      budget,
      3,
    );
    const content = parseJourneyDocument(
      journey.content,
      `${path}.content`,
      issues,
      budget,
      3,
    );
    if (id === null || audience === null || content === null) return;
    if (journeyIds.has(id)) {
      issues.push(`${path}.id: ID duplicado`);
      return;
    }
    journeyIds.add(id);
    journeys.push({ id, audience, content });
  });

  const topicValues = snapshotArray(
    record.topics,
    "$.topics",
    issues,
    budget,
    1,
  );
  if (topicValues !== null && topicValues.length === 0) {
    issues.push("$.topics: não pode ser vazio");
  }
  const topics: TutorialTopic[] = [];
  const topicIds = new Set<string>();
  const stepIds = new Set<string>();
  const mediaIds = new Set<string>();
  const referencedJourneyIds = new Set<string>();
  topicValues?.forEach((value, index) => {
    const path = `$.topics[${index}]`;
    const topic = snapshotRecord(value, path, issues, budget, 2);
    if (topic === null) return;
    validateExactKeys(
      topic,
      ["id", "audience", "journeyIds", "content"],
      [],
      path,
      issues,
    );
    const id = readStableId(topic.id, `${path}.id`, issues, budget);
    const audience = parseAudience(
      topic.audience,
      `${path}.audience`,
      profileIds,
      issues,
      budget,
      3,
    );
    const references = parseUniqueStableIds(
      topic.journeyIds,
      `${path}.journeyIds`,
      issues,
      budget,
      3,
      false,
    );
    for (const journeyId of references ?? []) {
      referencedJourneyIds.add(journeyId);
      if (!journeyIds.has(journeyId)) {
        issues.push(`${path}.journeyIds: jornada desconhecida`);
      }
    }
    const content =
      audience === null
        ? null
        : parseTopicDocument(
            topic.content,
            `${path}.content`,
            profileIds,
            audience,
            stepIds,
            mediaIds,
            issues,
            budget,
            3,
          );
    if (
      id === null ||
      audience === null ||
      references === null ||
      content === null
    ) {
      return;
    }
    if (topicIds.has(id)) {
      issues.push(`${path}.id: ID duplicado`);
      return;
    }
    topicIds.add(id);
    topics.push({ id, audience, journeyIds: references, content });
  });

  for (const journeyId of journeyIds) {
    if (!referencedJourneyIds.has(journeyId)) {
      issues.push("$.journeys: jornada não referenciada");
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  if (
    app === null ||
    version === null ||
    profileValues === null ||
    journeyValues === null ||
    topicValues === null
  ) {
    return { ok: false, issues: ["$: manifesto inválido"] };
  }
  return {
    ok: true,
    manifest: {
      schemaVersion: TUTORIAL_MANIFEST_SCHEMA_VERSION,
      app,
      version,
      profiles,
      topics,
      journeys,
    },
  };
}

/**
 * Valida e projeta o manifesto STANDARD completo.
 *
 * O schema é deliberadamente exato: campos editoriais de autorização são
 * rejeitados, accessors/protótipos não planos não atravessam a fronteira e
 * somente objetos canônicos recém-construídos são retornados.
 */
export function validateTutorialManifest(
  raw: unknown,
): TutorialManifestValidation {
  try {
    return validateTutorialManifestUnsafe(raw);
  } catch {
    return {
      ok: false,
      issues: ["$: entrada hostil ou inacessível"],
    };
  }
}

function failure(code: TutorialResolveErrorCode): TutorialResolveFailure {
  return { ok: false, code };
}

type ParsedAccess = {
  principal: "anonymous" | "authenticated";
  authorizedProfileIds: readonly string[];
  canPreviewAllProfiles: boolean;
  view: TutorialViewRequest;
};

function parseViewUnsafe(
  raw: unknown,
  issues: string[],
  budget: ValidationBudget,
): TutorialViewRequest | null {
  if (raw === undefined) return { kind: "mine" };
  const record = snapshotRecord(raw, "$access.view", issues, budget, 1);
  if (record === null) return null;
  if (record.kind === "mine" || record.kind === "all-profiles") {
    validateExactKeys(record, ["kind"], [], "$access.view", issues);
    return issues.length === 0 ? { kind: record.kind } : null;
  }
  if (record.kind === "preview-profile") {
    validateExactKeys(
      record,
      ["kind", "profileId"],
      [],
      "$access.view",
      issues,
    );
    const profileId = readStableId(
      record.profileId,
      "$access.view.profileId",
      issues,
      budget,
    );
    return issues.length === 0 && profileId !== null
      ? { kind: "preview-profile", profileId }
      : null;
  }
  issues.push('$access.view.kind: view inválida');
  return null;
}

function parseAccessUnsafe(
  raw: unknown,
): ParsedAccess | TutorialResolveFailure {
  const issues: string[] = [];
  const budget = createBudget();
  const record = snapshotRecord(raw, "$access", issues, budget, 0);
  if (record === null || issues.length > 0) {
    return failure("invalid-access");
  }

  if (record.kind === "invalid") {
    validateExactKeys(record, ["kind"], [], "$access", issues);
    return failure("invalid-access");
  }
  if (record.kind === "anonymous") {
    validateExactKeys(record, ["kind"], [], "$access", issues);
    return issues.length === 0
      ? {
          principal: "anonymous",
          authorizedProfileIds: [],
          canPreviewAllProfiles: false,
          view: { kind: "mine" },
        }
      : failure("invalid-access");
  }
  if (record.kind !== "authenticated") {
    return failure("invalid-access");
  }

  validateExactKeys(
    record,
    ["kind", "authorizedProfileIds", "canPreviewAllProfiles"],
    ["view"],
    "$access",
    issues,
  );
  if (typeof record.canPreviewAllProfiles !== "boolean") {
    issues.push("$access.canPreviewAllProfiles: boolean obrigatório");
  }
  const rawIds = snapshotArray(
    record.authorizedProfileIds,
    "$access.authorizedProfileIds",
    issues,
    budget,
    1,
  );
  const ids: string[] = [];
  const seen = new Set<string>();
  rawIds?.forEach((value, index) => {
    const id = readStableId(
      value,
      `$access.authorizedProfileIds[${index}]`,
      issues,
      budget,
    );
    if (id !== null && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  });
  if (issues.length > 0 || rawIds === null) {
    return failure("invalid-access");
  }

  const viewIssues: string[] = [];
  const view = parseViewUnsafe(record.view, viewIssues, budget);
  if (view === null || viewIssues.length > 0) {
    return failure("invalid-view");
  }
  return {
    principal: "authenticated",
    authorizedProfileIds: ids,
    canPreviewAllProfiles: record.canPreviewAllProfiles as boolean,
    view,
  };
}

function parseAccess(
  raw: unknown,
): ParsedAccess | TutorialResolveFailure {
  try {
    return parseAccessUnsafe(raw);
  } catch {
    return failure("invalid-access");
  }
}

function isResolveFailure(
  value: ParsedAccess | TutorialResolveFailure,
): value is TutorialResolveFailure {
  return "ok" in value && value.ok === false;
}

function audienceIsVisible(
  audience: TutorialAudience,
  activeProfileIds: ReadonlySet<string>,
): boolean {
  return (
    audience.kind === "public" ||
    audience.profileIds.some((profileId) => activeProfileIds.has(profileId))
  );
}

/**
 * Resolve somente conteúdo já autorizado pelo adapter do app.
 *
 * Pedidos explícitos de preview nunca fazem fallback silencioso para `mine`.
 * Falhas não devolvem manifesto, issues, perfis, tópicos ou jornadas.
 */
export function resolveTutorialVisibility(
  rawManifest: unknown,
  rawAccess: unknown,
): TutorialResolveResult {
  const validation = validateTutorialManifest(rawManifest);
  if (!validation.ok) return failure("invalid-manifest");
  const manifest = validation.manifest;

  const access = parseAccess(rawAccess);
  if (isResolveFailure(access)) return access;

  if (
    access.view.kind !== "mine" &&
    access.canPreviewAllProfiles !== true
  ) {
    return failure("preview-forbidden");
  }
  const knownProfileIds = new Set(
    manifest.profiles.map((profile) => profile.id),
  );
  if (
    access.authorizedProfileIds.some(
      (profileId) => !knownProfileIds.has(profileId),
    )
  ) {
    return failure("invalid-access");
  }
  if (
    access.view.kind === "preview-profile" &&
    !knownProfileIds.has(access.view.profileId)
  ) {
    return failure("unknown-preview-profile");
  }

  const activeProfileIds =
    access.view.kind === "all-profiles"
      ? manifest.profiles.map((profile) => profile.id)
      : access.view.kind === "preview-profile"
        ? [access.view.profileId]
        : access.authorizedProfileIds;
  const activeProfileIdSet = new Set(activeProfileIds);
  const activeProfiles = manifest.profiles.filter((profile) =>
    activeProfileIdSet.has(profile.id),
  );
  const profileOptions = access.canPreviewAllProfiles
    ? [...manifest.profiles]
    : [...activeProfiles];

  const visibleJourneyIds = new Set(
    manifest.journeys
      .filter((journey) =>
        audienceIsVisible(journey.audience, activeProfileIdSet),
      )
      .map((journey) => journey.id),
  );
  const referencedVisibleJourneyIds = new Set<string>();
  const topics = manifest.topics
    .filter((topic) =>
      audienceIsVisible(topic.audience, activeProfileIdSet),
    )
    .map((topic): ResolvedTutorialTopic => {
      const journeyIds = topic.journeyIds.filter((journeyId) =>
        visibleJourneyIds.has(journeyId),
      );
      journeyIds.forEach((journeyId) => {
        referencedVisibleJourneyIds.add(journeyId);
      });
      return {
        id: topic.id,
        journeyIds,
        content: topic.content,
      };
    });
  const journeys = manifest.journeys
    .filter(
      (journey) =>
        visibleJourneyIds.has(journey.id) &&
        referencedVisibleJourneyIds.has(journey.id),
    )
    .map(
      (journey): ResolvedTutorialJourney => ({
        id: journey.id,
        content: journey.content,
      }),
    );

  return {
    ok: true,
    app: manifest.app,
    version: manifest.version,
    principal: access.principal,
    view: access.view,
    activeProfiles,
    profileOptions,
    topics,
    journeys,
    canPreviewAllProfiles: access.canPreviewAllProfiles,
  };
}
