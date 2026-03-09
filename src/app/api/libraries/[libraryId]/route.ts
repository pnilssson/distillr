import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/server/core/supabase/server";

type DeleteLibraryRouteProps = {
  params: Promise<{ libraryId: string }>;
};

export async function DELETE(
  _request: Request,
  { params }: DeleteLibraryRouteProps,
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { libraryId } = await params;

  const { error } = await supabase
    .from("libraries")
    .delete()
    .eq("id", libraryId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
