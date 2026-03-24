import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setSourceAutoSync } from "@/features/sources/api";

type Variables = {
  libraryId: string;
  sourceId: string;
  enabled: boolean;
};

export function useSetSourceAutoSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: Variables) =>
      setSourceAutoSync(variables.libraryId, variables.sourceId, variables.enabled),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sources", variables.libraryId] });
    },
  });
}
