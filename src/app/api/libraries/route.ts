import { NextResponse } from "next/server";

import { createLibrarySchema } from "@/lib/validation/libraries";
import { captureServerEvent } from "@/server/core/analytics/posthog";
import { createSupabaseServerClient } from "@/server/core/supabase/server";
import { createLibrary, getUserLibraries } from "@/server/libraries/queries";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const libraries = await getUserLibraries(user.id);

  return NextResponse.json({ libraries });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parse = createLibrarySchema.safeParse(payload);

  if (!parse.success) {
    return NextResponse.json({ error: "Invalid library name." }, { status: 400 });
  }

  const library = await createLibrary(user.id, parse.data.name);

  if (!library) {
    return NextResponse.json({ error: "Unable to create library." }, { status: 400 });
  }

  await captureServerEvent(user.id, "library_created", {
    library_id: library.id,
  });

  return NextResponse.json({ library }, { status: 201 });
}
