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

      if (sources.some((source) => source.status === "processing")) {
        return 3000;
      }

      if (sources.some((source) => source.autoSyncEnabled)) {
        return 60000;
      }

      return false;
    },
  });
}
