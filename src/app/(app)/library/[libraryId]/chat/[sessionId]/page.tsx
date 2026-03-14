import { notFound } from "next/navigation";

import { ChatView } from "@/features/chat/ChatView";
import { toUIMessages } from "@/features/chat/transform";
import { requireUserOrRedirect } from "@/server/core/auth/user";
import { getChatSessionById, listChatMessages } from "@/server/chat/queries";
import { getLibraryById } from "@/server/libraries/queries";

type ChatSessionPageProps = {
  params: Promise<{ libraryId: string; sessionId: string }>;
};

export default async function ChatSessionPage({ params }: ChatSessionPageProps) {
  const { libraryId, sessionId } = await params;
  const user = await requireUserOrRedirect();

  const library = await getLibraryById(user.id, libraryId);
  if (!library) {
    notFound();
  }

  const session = await getChatSessionById(user.id, libraryId, sessionId);
  if (!session) {
    notFound();
  }

  const { messages: dbMessages } = await listChatMessages(user.id, libraryId, sessionId, {
    limit: 50,
  });

  const initialMessages = toUIMessages(
    dbMessages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    })),
  );

  return <ChatView libraryId={libraryId} sessionId={sessionId} messages={initialMessages} />;
}
