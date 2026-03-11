import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/server/core/supabase/server";
import { getLibraryById } from "@/server/libraries/queries";
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

  const library = await getLibraryById(user.id, libraryId);

  if (!library) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col h-full">
      <div className="flex flex-1 items-center justify-center">
        <EmptyLibraryState libraryId={libraryId} />
      </div>
    </main>
  );
}
