import { notFound } from "next/navigation";

import { requireUserOrRedirect } from "@/server/core/auth/user";
import { getLibraryById } from "@/server/libraries/queries";
import { EmptyLibraryChatState } from "@/features/libraries/EmptyLibraryChatState";
import { EmptyLibraryState } from "@/features/sources/EmptyLibraryState";

type LibraryPageProps = {
  params: Promise<{ libraryId: string }>;
};

export default async function LibraryPage({ params }: LibraryPageProps) {
  const { libraryId } = await params;
  const user = await requireUserOrRedirect();

  const library = await getLibraryById(user.id, libraryId);

  if (!library) {
    notFound();
  }

  return (
    <main className="flex h-full flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center">
        <EmptyLibraryState libraryId={libraryId} />
        <EmptyLibraryChatState libraryId={libraryId} />
      </div>
    </main>
  );
}
