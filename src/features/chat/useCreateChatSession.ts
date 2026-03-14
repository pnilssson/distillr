import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createChatSession } from "@/features/chat/api";

export function useCreateChatSession(libraryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => createChatSession(libraryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions", libraryId] });
    },
  });
}
