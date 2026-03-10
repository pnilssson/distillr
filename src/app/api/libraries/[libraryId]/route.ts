import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/server/core/supabase/server";
import { createLibrarySchema } from "@/lib/validation/libraries";

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

export async function PATCH(
  request: Request,
  { params }: DeleteLibraryRouteProps,
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
      { error: parsed.error.errors[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const { libraryId } = await params;

  const { data: library, error } = await supabase
    .from("libraries")
    .update({ name: parsed.data.name })
    .eq("id", libraryId)
    .eq("user_id", user.id)
    .select("id, name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ library });
}
