import * as Sentry from "@sentry/nextjs";

import { AppSidebar } from "@/features/navigation/AppSidebar";
import { MobileTopNav } from "@/features/navigation/MobileTopNav";
import { ensurePolarCustomerState } from "@/server/billing/polar/customers";
import { requireUserOrRedirect } from "@/server/core/auth/user";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUserOrRedirect();

  try {
    await ensurePolarCustomerState({
      userId: user.id,
      email: user.email ?? null,
      name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        area: "billing.auto_provision",
      },
      extra: {
        userId: user.id,
      },
    });
  }

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
