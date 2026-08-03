/**
 * Cliente canônico do Maranata Core — fonte de verdade pra Church/Pastor/User
 * da Suite Maranata (L99 Onda 3: fim das 5 cópias de lib/integrations/maranata-core.ts).
 *
 * Os tipos abaixo são FIÉIS às respostas reais das rotas do maranata-core
 * (app/api/{igrejas,pastores,pastores-gerais,users}) — não a espelhos locais.
 * Doc canônico: maranata-core/docs/CONCEITOS-SUITE.md
 */
/**
 * Tipo canônico da Church na Suite:
 * - CONGREGATION: as 14 unidades locais
 * - HEADQUARTERS: Sede administrativa
 * - CAMP: Acampamento Maranata (sítio)
 */
export type ChurchType = "CONGREGATION" | "HEADQUARTERS" | "CAMP";
export type CoreChurch = {
    id: string;
    slug: string;
    name: string;
    type: ChurchType;
    city: string;
    address: string | null;
    phone: string | null;
    whatsapp: string | null;
    lat: number | null;
    lng: number | null;
    memberCount: number | null;
    visible: boolean;
    pastoresCount: number;
    updatedAt: string;
};
export type CoreMinistryArea = "KIDS" | "TEEN" | "JOVENS" | "CASAIS" | "TERCEIRA_IDADE" | "LOUVOR";
export type CoreGeneralMinistryPastor = {
    id: string;
    ministry: CoreMinistryArea;
    user: {
        id: string;
        email: string;
        name: string | null;
        churchId: string | null;
    };
    notes: string | null;
    createdAt: string;
};
export type CorePastor = {
    id: string;
    name: string;
    role: string;
    /**
     * Funções pastorais aditivas (SENIOR/PRESIDENTE/ADMINISTRATIVO, ...) —
     * acumulam sobre `role`. Opcional: o Core pode ainda não retornar este
     * campo durante o rollout (ver `@paulo-brito-jr/maranata-suite-kit/pastoral`).
     */
    funcoes?: string[];
    isFullTime: boolean;
    onLeave: boolean;
    email: string | null;
    phone: string | null;
    birthday?: string | null;
    ordination?: string | null;
    spouseName?: string | null;
    spouseBday?: string | null;
    spousePhone?: string | null;
    address?: string | null;
    lat?: number | null;
    lng?: number | null;
    notes?: string | null;
    church: {
        id: string;
        slug: string;
        name: string;
    } | null;
};
export type CoreUser = {
    id: string;
    email: string;
    name: string | null;
    roles: string[];
    churchId: string | null;
    pastorId: string | null;
    emailVerified?: string | null;
    createdAt?: string;
    updatedAt?: string;
};
export type CoreClientOptions = {
    /** Identificação do app chamador — vira o header `x-source` (ex: "rodizio"). */
    source: string;
    /** Default: env MARANATA_CORE_URL, senão https://maranata-core.vercel.app */
    baseUrl?: string;
    /** Default: env MARANATA_INTEGRATION_KEY */
    integrationKey?: string;
    /** Cache dos GETs (Next fetch revalidate, segundos). Default: 600. */
    revalidate?: number;
};
export type CoreMutationResult<T> = {
    ok: true;
    data: T;
} | {
    ok: false;
    error: string;
};
export declare function createCoreClient(options: CoreClientOptions): {
    listChurches: (opts?: {
        type?: ChurchType;
        types?: ChurchType[];
    }) => Promise<{
        total: number;
        churches: CoreChurch[];
    } | null>;
    listCongregacoes: () => Promise<{
        total: number;
        churches: CoreChurch[];
    } | null>;
    listPastoresGerais: (opts?: {
        area?: CoreMinistryArea;
        userId?: string;
    }) => Promise<{
        total: number;
        pastores: CoreGeneralMinistryPastor[];
    } | null>;
    getChurch: (idOrSlugOrName: string) => Promise<CoreChurch | null>;
    listPastores: (opts?: {
        church?: string;
        role?: string;
    }) => Promise<{
        total: number;
        pastores: CorePastor[];
    } | null>;
    getPastor: (idOrEmail: string) => Promise<CorePastor | null>;
    getUserByEmail: (email: string) => Promise<CoreUser | null>;
    listUsers: (opts?: {
        email?: string;
    }) => Promise<{
        total: number;
        users: CoreUser[];
    } | null>;
    createChurchInCore: (input: {
        name: string;
        slug: string;
        city: string;
        address?: string;
        phone?: string;
        whatsapp?: string;
        memberCount?: number;
        notes?: string;
    }) => Promise<CoreMutationResult<CoreChurch>>;
    updateChurchInCore: (id: string, patch: Partial<CoreChurch> & {
        notes?: string | null;
    }) => Promise<CoreMutationResult<CoreChurch>>;
    archiveChurchInCore: (id: string) => Promise<CoreMutationResult<unknown>>;
    createPastorInCore: (input: {
        name: string;
        email?: string;
        phone?: string;
        role?: string;
        churchId?: string | null;
        isFullTime?: boolean;
        onLeave?: boolean;
    }) => Promise<CoreMutationResult<CorePastor>>;
    updatePastorInCore: (id: string, patch: Partial<CorePastor> & {
        churchId?: string | null;
    }) => Promise<CoreMutationResult<CorePastor>>;
    archivePastorInCore: (id: string) => Promise<CoreMutationResult<unknown>>;
    createUserInCore: (input: {
        email: string;
        name?: string;
        roles?: string[];
        churchId?: string | null;
    }) => Promise<CoreMutationResult<CoreUser>>;
    updateUserInCore: (emailOrId: string, patch: Partial<CoreUser>) => Promise<CoreMutationResult<CoreUser>>;
    revokeUserInCore: (emailOrId: string) => Promise<CoreMutationResult<unknown>>;
    coreStatus: () => Promise<{
        ok: boolean;
        igrejas: number;
        pastores: number;
        users: number;
    } | null>;
    reportAudit: (input: {
        action: string;
        entity: string;
        entityId?: string;
        actorEmail?: string;
        meta?: Record<string, unknown>;
    }) => Promise<void>;
};
export type CoreClient = ReturnType<typeof createCoreClient>;
//# sourceMappingURL=core.d.ts.map