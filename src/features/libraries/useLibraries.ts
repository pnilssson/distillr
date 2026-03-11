import { useQuery } from "@tanstack/react-query";

import { fetchLibraries } from "./api";

export function useLibraries() {
  return useQuery({
    queryKey: ["libraries"],
    queryFn: fetchLibraries,
  });
}
