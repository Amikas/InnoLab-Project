import { apiClient } from "./client";

export type ExportScope = "ALL" | "SELECTED" | "ITEM";

export interface ContentConflict {
  type: "challenge" | "course";
  key: string;
  existingTitle: string;
  incomingTitle: string;
}

export interface ContentPreview {
  challengeCount: number;
  courseCount: number;
  conflicts: ContentConflict[];
}

export interface ConflictDecision {
  type: "challenge" | "course";
  key: string;
  action: "SKIP" | "UPDATE";
}

export interface ImportSummary {
  challengesCreated: number;
  challengesUpdated: number;
  coursesCreated: number;
  coursesUpdated: number;
  skipped: number;
}

export async function exportContent(options: {
  mode: ExportScope;
  challengeIds?: string[];
  courseSlugs?: string[];
}): Promise<{ blob: Blob; filename?: string }> {
  return apiClient.requestBlob("/api/admin/content-transfer/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
}

export async function previewContent(file: File): Promise<ContentPreview> {
  const form = new FormData();
  form.append("file", file);
  return apiClient.request("/api/admin/content-transfer/preview", {
    method: "POST",
    body: form,
  });
}

export async function importContent(
  file: File,
  decisions: ConflictDecision[],
): Promise<ImportSummary> {
  const form = new FormData();
  form.append("file", file);
  form.append("decisions", JSON.stringify(decisions));
  return apiClient.request("/api/admin/content-transfer/import", {
    method: "POST",
    body: form,
  });
}
