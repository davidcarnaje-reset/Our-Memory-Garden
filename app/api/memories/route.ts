import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise";
import { getAuthenticatedSession } from "@/src/lib/auth";
import { ensureMemoriesTable, getDbPool, MemoryRow } from "@/src/lib/db";
import { uploadImageToDrive } from "@/src/lib/googleDrive";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const yearParam = request.nextUrl.searchParams.get("year") ?? "2026";
    if (!/^\d{4}$/.test(yearParam)) {
      return NextResponse.json({ error: "Invalid year parameter." }, { status: 400 });
    }

    await ensureMemoriesTable();
    const pool = getDbPool();

    const [rows] = await pool.execute<MemoryRow[]>(
      `SELECT id, memory_date, month_key, note, drive_file_id, uploaded_by, created_at
       FROM memories
       WHERE month_key LIKE ?
       ORDER BY memory_date ASC, id ASC`,
      [`${yearParam}-%`]
    );

    return NextResponse.json({ memories: rows });
  } catch (error) {
    console.error("GET /api/memories error:", error);
    return NextResponse.json(
      { error: "Failed to load memories from the garden." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get("image");
    const note = formData.get("note");
    const memoryDate = formData.get("memory_date");
    const uploadedBy = formData.get("uploaded_by");

    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json(
        { error: "Please choose a photo to plant with this memory." },
        { status: 400 }
      );
    }

    if (typeof note !== "string" || !note.trim()) {
      return NextResponse.json(
        { error: "Please write a little note for this memory." },
        { status: 400 }
      );
    }

    if (typeof memoryDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(memoryDate)) {
      return NextResponse.json(
        { error: "Please select a valid date (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    const author =
      typeof uploadedBy === "string" && uploadedBy.trim()
        ? uploadedBy.trim().slice(0, 50)
        : session.uploadedBy;

    const monthKey = memoryDate.slice(0, 7);
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeFileName = `${memoryDate}_${image.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const driveFileId = await uploadImageToDrive({
      buffer,
      mimeType: image.type || "image/jpeg",
      fileName: safeFileName,
      memoryDate,
    });

    await ensureMemoriesTable();
    const pool = getDbPool();

    const [insertResult] = await pool.execute<ResultSetHeader>(
      `INSERT INTO memories (memory_date, month_key, note, drive_file_id, uploaded_by)
       VALUES (?, ?, ?, ?, ?)`,
      [memoryDate, monthKey, note.trim(), driveFileId, author]
    );

    const [rows] = await pool.execute<MemoryRow[]>(
      `SELECT id, memory_date, month_key, note, drive_file_id, uploaded_by, created_at
       FROM memories
       WHERE id = ?`,
      [insertResult.insertId]
    );

    return NextResponse.json({ memory: rows[0] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/memories error:", error);
    return NextResponse.json(
      { error: "Failed to plant your memory. Please try again." },
      { status: 500 }
    );
  }
}
