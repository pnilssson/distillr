import { redirect } from "next/navigation";

import { AppSidebar } from "@/features/navigation/AppSidebar";
import { MobileTopNav } from "@/features/navigation/MobileTopNav";
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

  return (
    <SidebarProvider>
      <AppSidebar userEmail={user.email ?? ""} userId={user.id} />
      <SidebarInset>
        <MobileTopNav />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
