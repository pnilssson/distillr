import { useQuery } from "@tanstack/react-query";

import { fetchChatSessions } from "@/features/chat/api";

export function useChatSessions(libraryId: string | null) {
  return useQuery({
    queryKey: ["chat-sessions", libraryId],
    queryFn: () => fetchChatSessions(libraryId!),
    enabled: Boolean(libraryId),
  });
}
