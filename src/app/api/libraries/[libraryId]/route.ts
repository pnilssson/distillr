import { NextResponse } from "next/server";

import { createLibrarySchema } from "@/lib/validation/libraries";
import { withApiAuth } from "@/server/core/auth/api";
import { deleteLibrary, updateLibrary } from "@/server/libraries/queries";

type LibraryRouteProps = {
  params: Promise<{ libraryId: string }>;
};

export const DELETE = withApiAuth<LibraryRouteProps>(
  async (_request, { params, user }) => {
    const { libraryId } = await params;

    await deleteLibrary(user.id, libraryId);

    return NextResponse.json({ success: true });
  },
);

export const PATCH = withApiAuth<LibraryRouteProps>(async (request, { params, user }) => {
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
});
