import { apiClient } from "../utils/apiClient";

export type SignatureRequestStatus =
  | "draft"
  | "ready"
  | "in_progress"
  | "declined"
  | "completed"
  | "cancelled";

export type SignerStatus = "pending" | "sent" | "signed" | "declined";

export type SignatureMethod = "draw" | "type";

export type SignerRole = "customer" | "em_franchisee" | "witness" | "other";

export interface SignatureLocation {
  source: "gps" | "ip" | "none";
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  capturedAt: string | null;
  mapUrl: string | null;
}

export interface Signer {
  id: string;
  signatureId: string | null;
  printedName: string;
  name: string;
  email: string;
  title: string;
  role: SignerRole;
  placement: string;
  order: number;
  status: SignerStatus;
  signedAt: string | null;
  signedBy: string | null;
  signedVia: "in_person" | "remote_link" | null;
  signatureMethod: SignatureMethod | null;
  typedName: string;
  typedFontFamily: string;
  hasSignatureImage: boolean;
  consentAccepted: boolean;
  location: SignatureLocation | null;
  invitedAt: string | null;
  invitedBy: string | null;
  inviteCount: number;
  declinedAt: string | null;
  declineReason: string;
  addedBy: string | null;
  linkActive: boolean;
  tokenExpiresAt: string | null;
  signingUrl: string | null;
}

export interface SignedPdfInfo {
  available: boolean;
  stale: boolean;
  sizeBytes: number;
  pageCount: number;
  generatedAt: string | null;
  sha256: string | null;
  sourceSha256: string | null;
}

export interface SignatureRequest {
  id: string;
  agreementId: string;
  agreementTitle: string;
  envelopeId: string;
  signedPdf: SignedPdfInfo;
  versionId: string | null;
  versionNumber: number | null;
  versionLabel: string;
  status: SignatureRequestStatus;
  signers: Signer[];
  totalSigners: number;
  signedCount: number;
  pendingCount: number;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
}

export interface SignatureDocument {
  kind: "version" | "agreement";
  id: string;
  label: string;
  versionNumber: number | null;
  fileName: string;
  sizeBytes: number;
  createdAt: string | null;
  createdBy: string | null;
}

export interface SignatureRoomResponse {
  success: boolean;
  request: SignatureRequest;
  document: SignatureDocument;
  hasNewerVersion: boolean;
  latestVersion: { id: string; versionNumber: number; label: string } | null;
}

export interface SignerInput {
  name: string;
  email?: string;
  title?: string;
  role?: SignerRole;
  placement?: string;
}

export interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

export interface SignPayload {
  method: SignatureMethod;
  printedName: string;
  signatureImage?: string;
  typedName?: string;
  typedFontFamily?: string;
  consentAccepted: boolean;
  location?: CapturedLocation | null;
}

export interface PublicSigningContext {
  success: boolean;
  agreementTitle: string;
  documentLabel: string;
  requestStatus: SignatureRequestStatus;
  totalSigners: number;
  signedCount: number;
  signer: {
    id: string;
    name: string;
    email: string;
    title: string;
    role: SignerRole;
    placement: string;
    status: SignerStatus;
    signedAt: string | null;
  };
}

export interface SignatureListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: SignatureRequestStatus | "all";
  mine?: boolean;
}

export interface SignatureSummary {
  actionRequired: number;
  waitingForOthers: number;
  expiringSoon: number;
  completed: number;
  expiringSoonWindowDays: number;
}

export interface SignatureListResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  counts: Record<string, number>;
  summary: SignatureSummary;
  requests: SignatureRequest[];
}

const BASE = "/api/signatures";

function portalOrigin(): { portalOrigin?: string } {
  if (typeof window === "undefined") return {};
  return { portalOrigin: window.location.origin };
}

function unwrap<T>(response: { data?: T; error?: string }): T {
  if (response.error || !response.data) {
    throw new Error(response.error || "Signature request failed");
  }
  return response.data;
}

export const signatureApi = {
  async list(filters: SignatureListFilters = {}): Promise<SignatureListResponse> {
    const params = new URLSearchParams();
    params.set("page", String(filters.page ?? 1));
    params.set("limit", String(filters.limit ?? 20));
    if (filters.search?.trim()) params.set("search", filters.search.trim());
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    if (filters.mine) params.set("mine", "true");

    return unwrap(
      await apiClient.get<SignatureListResponse>(`${BASE}?${params.toString()}`)
    );
  },

  async getRoom(agreementId: string): Promise<SignatureRoomResponse> {
    return unwrap(
      await apiClient.get<SignatureRoomResponse>(`${BASE}/agreement/${agreementId}`)
    );
  },

  async syncToLatestVersion(agreementId: string): Promise<SignatureRoomResponse> {
    return unwrap(
      await apiClient.post<SignatureRoomResponse>(
        `${BASE}/agreement/${agreementId}/sync-version`
      )
    );
  },

  async addSigner(agreementId: string, signer: SignerInput): Promise<SignatureRoomResponse> {
    return unwrap(
      await apiClient.post<SignatureRoomResponse>(
        `${BASE}/agreement/${agreementId}/signers`,
        signer
      )
    );
  },

  async updateSigner(
    agreementId: string,
    signerId: string,
    signer: Partial<SignerInput>
  ): Promise<SignatureRoomResponse> {
    return unwrap(
      await apiClient.patch<SignatureRoomResponse>(
        `${BASE}/agreement/${agreementId}/signers/${signerId}`,
        signer
      )
    );
  },

  async removeSigner(agreementId: string, signerId: string): Promise<SignatureRoomResponse> {
    return unwrap(
      await apiClient.delete<SignatureRoomResponse>(
        `${BASE}/agreement/${agreementId}/signers/${signerId}`
      )
    );
  },

  async sendInvite(
    agreementId: string,
    signerId: string,
    email?: string
  ): Promise<{ success: boolean; signer: Signer; signingUrl: string }> {
    return unwrap(
      await apiClient.post<{ success: boolean; signer: Signer; signingUrl: string }>(
        `${BASE}/agreement/${agreementId}/signers/${signerId}/invite`,
        { ...portalOrigin(), ...(email ? { email } : {}) }
      )
    );
  },

  async createLink(
    agreementId: string,
    signerId: string
  ): Promise<{ success: boolean; signer: Signer; signingUrl: string }> {
    return unwrap(
      await apiClient.post<{ success: boolean; signer: Signer; signingUrl: string }>(
        `${BASE}/agreement/${agreementId}/signers/${signerId}/link`,
        portalOrigin()
      )
    );
  },

  async resetSigner(
    agreementId: string,
    signerId: string
  ): Promise<SignatureRoomResponse> {
    return unwrap(
      await apiClient.post<SignatureRoomResponse>(
        `${BASE}/agreement/${agreementId}/signers/${signerId}/reset`
      )
    );
  },

  async revokeLink(
    agreementId: string,
    signerId: string
  ): Promise<{ success: boolean; signer: Signer }> {
    return unwrap(
      await apiClient.post<{ success: boolean; signer: Signer }>(
        `${BASE}/agreement/${agreementId}/signers/${signerId}/revoke-link`
      )
    );
  },

  async sign(
    agreementId: string,
    signerId: string,
    payload: SignPayload
  ): Promise<SignatureRoomResponse> {
    return unwrap(
      await apiClient.post<SignatureRoomResponse>(
        `${BASE}/agreement/${agreementId}/signers/${signerId}/sign`,
        payload
      )
    );
  },

  async downloadSignedPdf(agreementId: string): Promise<Blob> {
    return apiClient.downloadBlob(`${BASE}/agreement/${agreementId}/signed-pdf`);
  },

  async regenerateSignedPdf(agreementId: string): Promise<SignatureRoomResponse> {
    return unwrap(
      await apiClient.post<SignatureRoomResponse>(
        `${BASE}/agreement/${agreementId}/finalize`
      )
    );
  },

  getSignerImageUrl(agreementId: string, signerId: string): string {
    return `${BASE}/agreement/${agreementId}/signers/${signerId}/image`;
  },

  async downloadSignerImage(agreementId: string, signerId: string): Promise<Blob> {
    return apiClient.downloadBlob(this.getSignerImageUrl(agreementId, signerId));
  },

  async getPublicContext(token: string): Promise<PublicSigningContext> {
    return unwrap(
      await apiClient.get<PublicSigningContext>(`${BASE}/public/${token}`)
    );
  },

  async downloadPublicPdf(token: string): Promise<Blob> {
    return apiClient.downloadBlob(`${BASE}/public/${token}/pdf`);
  },

  async signPublic(
    token: string,
    payload: SignPayload
  ): Promise<{ success: boolean; signedAt: string; location: SignatureLocation | null }> {
    return unwrap(
      await apiClient.post<{
        success: boolean;
        signedAt: string;
        location: SignatureLocation | null;
      }>(`${BASE}/public/${token}/sign`, payload)
    );
  },

  async declinePublic(token: string, reason: string): Promise<{ success: boolean }> {
    return unwrap(
      await apiClient.post<{ success: boolean }>(`${BASE}/public/${token}/decline`, {
        reason,
      })
    );
  },
};
