import { redirect } from "next/navigation";

import { AppSidebar } from "@/features/navigation/AppSidebar";
import { createSupabaseServerClient } from "@/server/core/supabase/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("libraries")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  const libraries = (data ?? []).map((library) => ({
    id: library.id,
    name: library.name,
    createdAt: library.created_at,
  }));

  return (
    <SidebarProvider>
      <AppSidebar
        libraries={libraries}
        userEmail={user.email ?? ""}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
