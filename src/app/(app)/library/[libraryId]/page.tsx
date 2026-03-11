import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/server/core/supabase/server";
import { getLibraryById } from "@/server/libraries/queries";
import { getLibrarySources } from "@/server/sources/queries";
import { EmptyLibraryState } from "@/features/sources/EmptyLibraryState";

type LibraryPageProps = {
  params: Promise<{ libraryId: string }>;
};

export default async function LibraryPage({ params }: LibraryPageProps) {
  const { libraryId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const [library, sources] = await Promise.all([
    getLibraryById(user.id, libraryId),
    getLibrarySources(user.id, libraryId),
  ]);

  if (!library) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col h-full">
      {sources.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <EmptyLibraryState libraryId={libraryId} />
        </div>
      )}
    </main>
  );
}
