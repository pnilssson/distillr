import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/server/core/supabase/server";

type LibraryPageProps = {
  params: Promise<{ libraryId: string }>;
};

export default async function LibraryPage({ params }: LibraryPageProps) {
  const { libraryId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: library } = await supabase
    .from("libraries")
    .select("id")
    .eq("id", libraryId)
    .single();

  if (!library) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col h-full">
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Chat coming soon.</p>
      </div>
    </main>
  );
}
