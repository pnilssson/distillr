import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteSource } from "./api";

type DeleteSourceVariables = {
  libraryId: string;
  sourceId: string;
};

export function useDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: DeleteSourceVariables) =>
      deleteSource(variables.libraryId, variables.sourceId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sources", variables.libraryId] });
      queryClient.invalidateQueries({ queryKey: ["videos", variables.libraryId] });
    },
  });
}
