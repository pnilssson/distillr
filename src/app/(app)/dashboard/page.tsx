import { DashboardWelcome } from "@/features/libraries/DashboardWelcome";
import { createSupabaseServerClient } from "@/server/core/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("libraries")
    .select("id")
    .limit(1);

  const hasLibraries = (data ?? []).length > 0;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <DashboardWelcome hasLibraries={hasLibraries} />
    </main>
  );
}
