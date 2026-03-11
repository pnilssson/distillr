import { NextResponse } from "next/server";

import { createLibrarySchema } from "@/lib/validation/libraries";
import { captureServerEvent } from "@/server/core/analytics/posthog";
import { withApiAuth } from "@/server/core/auth/api";
import { createLibrary, getUserLibraries } from "@/server/libraries/queries";

export const GET = withApiAuth(async (_request, { user }) => {
  const libraries = await getUserLibraries(user.id);

  return NextResponse.json({ libraries });
});

export const POST = withApiAuth(async (request, { user }) => {
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
});
