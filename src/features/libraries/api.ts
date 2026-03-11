import type { LibraryListItem } from "./types";

export async function fetchLibraries(): Promise<LibraryListItem[]> {
  const response = await fetch("/api/libraries");
  if (!response.ok) throw new Error("Failed to fetch libraries");
  const payload = (await response.json()) as { libraries: LibraryListItem[] };
  return payload.libraries;
}

export async function createLibrary(name: string): Promise<LibraryListItem> {
  const response = await fetch("/api/libraries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const payload = (await response.json()) as
    | { library: LibraryListItem }
    | { error: string };
  if (!response.ok || !("library" in payload)) {
    throw new Error("error" in payload ? payload.error : "Unable to create library.");
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
  const payload = (await response.json()) as
    | { library: { id: string; name: string } }
    | { error: string };
  if (!response.ok || !("library" in payload)) {
    throw new Error("error" in payload ? payload.error : "Unable to rename library.");
  }
  return payload.library;
}

export async function deleteLibrary(id: string): Promise<void> {
  await fetch(`/api/libraries/${id}`, { method: "DELETE" });
}
