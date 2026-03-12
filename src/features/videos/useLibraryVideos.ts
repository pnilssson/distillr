import { useQuery } from "@tanstack/react-query";

import { fetchLibraryVideosProgress } from "@/features/videos/api";

export function useLibraryVideos(libraryId: string | null) {
  return useQuery({
    queryKey: ["videos", libraryId],
    queryFn: () => fetchLibraryVideosProgress(libraryId!),
    enabled: Boolean(libraryId),
    staleTime: 0,
    refetchInterval: (query) => {
      const data = query.state.data;

      if (!data) {
        return false;
      }

      return data.hasInFlight || data.isProcessing ? 3000 : false;
    },
  });
}
