import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createLibrary } from "./api";

type CreateLibraryVariables = {
  name: string;
};

export function useCreateLibrary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: CreateLibraryVariables) => createLibrary(variables.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
    },
  });
}
