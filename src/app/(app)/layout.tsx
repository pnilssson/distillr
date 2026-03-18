import { AppSidebar } from "@/features/navigation/AppSidebar";
import { MobileTopNav } from "@/features/navigation/MobileTopNav";
import { requireUserOrRedirect } from "@/server/core/auth/user";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUserOrRedirect();

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar userEmail={user.email ?? ""} userId={user.id} />
      <SidebarInset className="h-svh min-h-0 overflow-hidden">
        <MobileTopNav />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
