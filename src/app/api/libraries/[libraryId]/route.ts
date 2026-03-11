import { NextResponse } from "next/server";

import { createLibrarySchema } from "@/lib/validation/libraries";
import { createSupabaseServerClient } from "@/server/core/supabase/server";
import { deleteLibrary, updateLibrary } from "@/server/libraries/queries";

type LibraryRouteProps = {
  params: Promise<{ libraryId: string }>;
};

export async function DELETE(
  _request: Request,
  { params }: LibraryRouteProps,
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { libraryId } = await params;

  await deleteLibrary(user.id, libraryId);

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: LibraryRouteProps,
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createLibrarySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const { libraryId } = await params;

  const library = await updateLibrary(user.id, libraryId, parsed.data.name);

  if (!library) {
    return NextResponse.json({ error: "Library not found." }, { status: 404 });
  }

  return NextResponse.json({ library });
}
