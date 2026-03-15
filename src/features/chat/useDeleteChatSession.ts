import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteChatSession } from "@/features/chat/api";

export function useDeleteChatSession(libraryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => deleteChatSession(libraryId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions", libraryId] });
    },
  });
}
