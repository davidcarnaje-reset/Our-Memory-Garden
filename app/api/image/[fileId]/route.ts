import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getDriveImageStream } from "@/src/lib/googleDrive";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  const cookieStore = await cookies();
  if (cookieStore.get("garden_auth")?.value !== "authenticated") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { fileId } = await context.params;
  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return new NextResponse("Invalid file ID", { status: 400 });
  }

  try {
    const { buffer, mimeType } = await getDriveImageStream(fileId);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error(`GET /api/image/${fileId} error:`, error);
    return new NextResponse("Image not found", { status: 404 });
  }
}
