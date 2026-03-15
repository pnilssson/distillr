import { useMutation, useQueryClient } from "@tanstack/react-query";

import { renameLibrary } from "./api";

type RenameLibraryVariables = {
  libraryId: string;
  name: string;
};

export function useRenameLibrary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: RenameLibraryVariables) =>
      renameLibrary(variables.libraryId, variables.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["libraries"] });
    },
  });
}
