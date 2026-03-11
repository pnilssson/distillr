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
    <SidebarProvider>
      <AppSidebar userEmail={user.email ?? ""} userId={user.id} />
      <SidebarInset>
        <MobileTopNav />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
