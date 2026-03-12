import { useQuery } from "@tanstack/react-query";

import { fetchSources } from "./api";

export function useSources(libraryId: string | null) {
  return useQuery({
    queryKey: ["sources", libraryId],
    queryFn: () => fetchSources(libraryId!),
    enabled: Boolean(libraryId),
    refetchInterval: (query) => {
      const sources = query.state.data;

      if (!sources || sources.length === 0) {
        return false;
      }

      return sources.some((source) => source.status === "processing") ? 3000 : false;
    },
  });
}
