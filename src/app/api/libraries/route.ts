import { NextResponse } from "next/server";

import { createLibrarySchema } from "@/lib/validation/libraries";
import { captureServerEvent } from "@/server/core/analytics/posthog";
import { createSupabaseServerClient } from "@/server/core/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("libraries")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const libraries = (data ?? []).map((library) => ({
    id: library.id,
    name: library.name,
    createdAt: library.created_at,
  }));

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

  const { data, error } = await supabase
    .from("libraries")
    .insert({
      user_id: user.id,
      name: parse.data.name,
    })
    .select("id, name, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Unable to create library." },
      { status: 400 },
    );
  }

  await captureServerEvent(user.id, "library_created", {
    library_id: data.id,
  });

  return NextResponse.json(
    {
      library: {
        id: data.id,
        name: data.name,
        createdAt: data.created_at,
      },
    },
    { status: 201 },
  );
}
