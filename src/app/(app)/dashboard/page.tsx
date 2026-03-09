import { redirect } from "next/navigation";

import { LibrariesDashboard } from "@/features/libraries/LibrariesDashboard";
import { createSupabaseServerClient } from "@/server/core/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("libraries")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const libraries = (data ?? []).map((library) => ({
    id: library.id,
    name: library.name,
    createdAt: library.created_at,
  }));

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <LibrariesDashboard initialLibraries={libraries} currentUserId={user.id} />
    </main>
  );
}
