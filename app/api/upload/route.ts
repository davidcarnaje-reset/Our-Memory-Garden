import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/src/lib/auth";
import { uploadImageToDrive } from "@/src/lib/googleDrive";

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const memoryDate = formData.get("memory_date");
    const folder = formData.get("folder");

    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json(
        { error: "Please choose a photo to upload." },
        { status: 400 }
      );
    }

    const validDate =
      typeof memoryDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(memoryDate)
        ? memoryDate
        : undefined;

    const subfolderName = folder === "daily" ? "Daily Pictures" : undefined;

    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeFileName = `${validDate ?? "memory"}_${image.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )}`;

    const fileId = await uploadImageToDrive({
      buffer,
      mimeType: image.type || "image/jpeg",
      fileName: safeFileName,
      memoryDate: validDate,
      subfolderName,
    });

    return NextResponse.json({ fileId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload photo to Google Drive." },
      { status: 500 }
    );
  }
}
