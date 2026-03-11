import { useQuery } from "@tanstack/react-query";

import { fetchSources } from "./api";

export function useSources(libraryId: string | null) {
  return useQuery({
    queryKey: ["sources", libraryId],
    queryFn: () => fetchSources(libraryId!),
    enabled: Boolean(libraryId),
  });
}
