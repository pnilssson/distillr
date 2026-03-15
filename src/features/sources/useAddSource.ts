import { useMutation, useQueryClient } from "@tanstack/react-query";

import { addSource } from "./api";

type AddSourceVariables = {
  libraryId: string;
  url: string;
};

export function useAddSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: AddSourceVariables) => addSource(variables.libraryId, variables.url),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sources", variables.libraryId] });
      queryClient.invalidateQueries({ queryKey: ["videos", variables.libraryId] });
    },
  });
}
