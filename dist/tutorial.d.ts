/**
 * Contrato headless dos tutoriais da Suite Maranata.
 *
 * A fronteira de confiança fica no adapter server-side de cada app. Ele
 * interpreta sessão, papéis, permissões e claims e entrega uma decisão de
 * acesso explícita. Este módulo valida e projeta um manifesto canônico antes
 * de resolver visibilidade; objetos recebidos nunca são reutilizados.
 */
export declare const TUTORIAL_MANIFEST_SCHEMA_VERSION = "tutorial-manifest.v1";
export declare const TUTORIAL_INPUT_LIMITS: Readonly<{
    maxDepth: 32;
    maxStringLength: 100000;
    maxArrayLength: 5000;
    maxObjectKeys: 64;
    maxNodes: 25000;
    maxTotalStringLength: 2000000;
}>;
export type TutorialAudience = {
    readonly kind: "public";
} | {
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
export type TutorialViewRequest = {
    readonly kind: "mine";
} | {
    readonly kind: "preview-profile";
    readonly profileId: string;
} | {
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
export type TutorialAccess = TutorialAnonymousAccess | TutorialAuthenticatedAccess;
/**
 * `invalid` representa sessão/claims ausentes, expirados ou inconsistentes.
 * Ele nunca equivale a um visitante anônimo legítimo.
 */
export type TutorialAccessDecision = TutorialAccess | {
    readonly kind: "invalid";
};
export type TutorialAccessAdapter<TSession> = (session: TSession) => TutorialAccessDecision | Promise<TutorialAccessDecision>;
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
export type TutorialResolveErrorCode = "invalid-manifest" | "invalid-access" | "invalid-view" | "preview-forbidden" | "unknown-preview-profile";
export type TutorialResolveFailure = {
    readonly ok: false;
    readonly code: TutorialResolveErrorCode;
};
export type TutorialResolveResult = TutorialResolveSuccess | TutorialResolveFailure;
export type TutorialManifestValidation = {
    readonly ok: true;
    readonly manifest: StandardTutorialManifest;
} | {
    readonly ok: false;
    readonly issues: readonly string[];
};
/**
 * Valida e projeta o manifesto STANDARD completo.
 *
 * O schema é deliberadamente exato: campos editoriais de autorização são
 * rejeitados, accessors/protótipos não planos não atravessam a fronteira e
 * somente objetos canônicos recém-construídos são retornados.
 */
export declare function validateTutorialManifest(raw: unknown): TutorialManifestValidation;
/**
 * Resolve somente conteúdo já autorizado pelo adapter do app.
 *
 * Pedidos explícitos de preview nunca fazem fallback silencioso para `mine`.
 * Falhas não devolvem manifesto, issues, perfis, tópicos ou jornadas.
 */
export declare function resolveTutorialVisibility(rawManifest: unknown, rawAccess: unknown): TutorialResolveResult;
//# sourceMappingURL=tutorial.d.ts.map