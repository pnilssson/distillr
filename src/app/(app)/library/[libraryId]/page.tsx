import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/server/core/supabase/server";
import { EmptyLibraryState } from "@/features/sources/EmptyLibraryState";

type LibraryPageProps = {
  params: Promise<{ libraryId: string }>;
};

export default async function LibraryPage({ params }: LibraryPageProps) {
  const { libraryId } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: library }, { count: sourceCount }] = await Promise.all([
    supabase.from("libraries").select("id").eq("id", libraryId).single(),
    supabase.from("sources").select("id", { count: "exact", head: true }).eq("library_id", libraryId),
  ]);

  if (!library) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col h-full">
      {sourceCount === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <EmptyLibraryState libraryId={libraryId} />
        </div>
      )}
    </main>
  );
}
