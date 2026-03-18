import { notFound } from "next/navigation";

import { requireUserOrRedirect } from "@/server/core/auth/user";
import { getLibraryById } from "@/server/libraries/queries";
import { LibraryDashboard } from "@/features/libraries/LibraryDashboard";

type LibraryPageProps = {
  params: Promise<{ libraryId: string }>;
};

export default async function LibraryPage({ params }: LibraryPageProps) {
  const { libraryId } = await params;
  const user = await requireUserOrRedirect();

  const library = await getLibraryById(user.id, libraryId);

  if (!library) {
    notFound();
  }

  return <LibraryDashboard libraryId={libraryId} libraryName={library.name} />;
}
