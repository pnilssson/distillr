import type { LibraryListItem } from "./types";

import { getApiErrorMessage, parseJsonResponse } from "@/lib/http/response";

export async function fetchLibraries(): Promise<LibraryListItem[]> {
  const response = await fetch("/api/libraries");

  const payload = await parseJsonResponse<{ libraries: LibraryListItem[] } | { error: string }>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Could not load libraries. Please try again."));
  }

  if (!payload || !("libraries" in payload)) {
    throw new Error("Could not load libraries. Please try again.");
  }

  return payload.libraries;
}

export async function createLibrary(name: string): Promise<LibraryListItem> {
  const response = await fetch("/api/libraries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  const payload = await parseJsonResponse<
    | { library: LibraryListItem }
    | { error: string }
  >(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Could not create library. Please try again."));
  }

  if (!payload || !("library" in payload)) {
    throw new Error("Could not create library. Please try again.");
  }

  return payload.library;
}

export async function renameLibrary(
  id: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const response = await fetch(`/api/libraries/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  const payload = await parseJsonResponse<
    | { library: { id: string; name: string } }
    | { error: string }
  >(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Could not rename library. Please try again."));
  }

  if (!payload || !("library" in payload)) {
    throw new Error("Could not rename library. Please try again.");
  }

  return payload.library;
}

export async function deleteLibrary(id: string): Promise<void> {
  const response = await fetch(`/api/libraries/${id}`, { method: "DELETE" });

  const payload = await parseJsonResponse<{ ok: true } | { error: string }>(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, "Could not delete library. Please try again."));
  }
}
