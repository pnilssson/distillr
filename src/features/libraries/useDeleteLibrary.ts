import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteLibrary } from "./api";

type DeleteLibraryVariables = {
  libraryId: string;
};

export function useDeleteLibrary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: DeleteLibraryVariables) => deleteLibrary(variables.libraryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
    },
  });
}
