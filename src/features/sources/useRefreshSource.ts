import { useMutation, useQueryClient } from "@tanstack/react-query";

import { refreshSource } from "./api";

type RefreshSourceVariables = {
  libraryId: string;
  sourceId: string;
};

export function useRefreshSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: RefreshSourceVariables) =>
      refreshSource(variables.libraryId, variables.sourceId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sources", variables.libraryId] });
      queryClient.invalidateQueries({ queryKey: ["videos", variables.libraryId] });
    },
  });
}
