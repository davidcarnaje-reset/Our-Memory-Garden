import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise";
import { getAuthenticatedSession } from "@/src/lib/auth";
import {
  ensureMemoriesTable,
  getDbPool,
  MemoryMood,
  MemoryReply,
  MemoryReplyRow,
  MemoryRow,
  parseDriveFileIds,
} from "@/src/lib/db";
import { uploadImageToDrive } from "@/src/lib/googleDrive";

const VALID_MOODS = new Set<MemoryMood>([
  "date_night",
  "travel",
  "milestone",
  "cozy",
]);

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function serializeMemory(row: MemoryRow, replies: MemoryReply[]) {
  const today = getTodayIsoDate();
  const isLocked = Boolean(row.unlock_date && row.unlock_date > today);
  const fileIds = parseDriveFileIds(row.drive_file_ids, row.drive_file_id);

  return {
    id: row.id,
    memory_date: row.memory_date,
    month_key: row.month_key,
    note: isLocked ? "" : row.note,
    drive_file_id: isLocked ? "" : (fileIds[0] ?? row.drive_file_id),
    drive_file_ids: isLocked ? [] : fileIds,
    uploaded_by: row.uploaded_by,
    mood: row.mood,
    unlock_date: row.unlock_date,
    created_at: row.created_at,
    replies,
  };
}

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const yearParam = request.nextUrl.searchParams.get("year") ?? "2026";
    if (!/^\d{4}$/.test(yearParam)) {
      return NextResponse.json({ error: "Invalid year parameter." }, { status: 400 });
    }

    await ensureMemoriesTable();
    const pool = getDbPool();

    const [rows] = await pool.execute<MemoryRow[]>(
      `SELECT id, memory_date, month_key, note, drive_file_id, drive_file_ids, uploaded_by, mood, unlock_date, created_at
       FROM memories
       WHERE month_key LIKE ?
       ORDER BY memory_date ASC, id ASC`,
      [`${yearParam}-%`]
    );

    const repliesByMemoryId: Record<number, MemoryReply[]> = {};
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const placeholders = ids.map(() => "?").join(",");
      const [replyRows] = await pool.execute<MemoryReplyRow[]>(
        `SELECT id, memory_id, author, message, reaction, created_at
         FROM memory_replies
         WHERE memory_id IN (${placeholders})
         ORDER BY created_at ASC, id ASC`,
        ids
      );
      for (const reply of replyRows) {
        if (!repliesByMemoryId[reply.memory_id]) {
          repliesByMemoryId[reply.memory_id] = [];
        }
        repliesByMemoryId[reply.memory_id].push(reply);
      }
    }

    const memories = rows.map((row) =>
      serializeMemory(row, repliesByMemoryId[row.id] ?? [])
    );

    return NextResponse.json({ memories });
  } catch (error) {
    console.error("GET /api/memories error:", error);
    return NextResponse.json(
      { error: "Failed to load memories from the garden." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let note = "";
    let memoryDate = "";
    let uploadedBy = session.uploadedBy;
    let mood: MemoryMood = "cozy";
    let unlockDate: string | null = null;
    let driveFileIds: string[] = [];

    if (contentType.includes("application/json")) {
      const body = await request.json();
      note = typeof body?.note === "string" ? body.note.trim() : "";
      memoryDate = typeof body?.memory_date === "string" ? body.memory_date : "";
      if (typeof body?.uploaded_by === "string" && body.uploaded_by.trim()) {
        uploadedBy = body.uploaded_by.trim().slice(0, 50);
      }
      if (typeof body?.mood === "string" && VALID_MOODS.has(body.mood as MemoryMood)) {
        mood = body.mood as MemoryMood;
      }
      if (typeof body?.unlock_date === "string" && body.unlock_date.trim()) {
        unlockDate = body.unlock_date.trim();
      }
      if (Array.isArray(body?.drive_file_ids)) {
        driveFileIds = body.drive_file_ids.filter(
          (id: unknown): id is string =>
            typeof id === "string" && id.trim().length > 0
        );
      }
    } else {
      const formData = await request.formData();
      const image = formData.get("image");
      const noteRaw = formData.get("note");
      const memoryDateRaw = formData.get("memory_date");
      const uploadedByRaw = formData.get("uploaded_by");
      const moodRaw = formData.get("mood");
      const unlockDateRaw = formData.get("unlock_date");

      note = typeof noteRaw === "string" ? noteRaw.trim() : "";
      memoryDate = typeof memoryDateRaw === "string" ? memoryDateRaw : "";
      if (typeof uploadedByRaw === "string" && uploadedByRaw.trim()) {
        uploadedBy = uploadedByRaw.trim().slice(0, 50);
      }
      if (typeof moodRaw === "string" && VALID_MOODS.has(moodRaw as MemoryMood)) {
        mood = moodRaw as MemoryMood;
      }
      if (typeof unlockDateRaw === "string" && unlockDateRaw.trim()) {
        unlockDate = unlockDateRaw.trim();
      }

      if (image instanceof File && image.size > 0) {
        const arrayBuffer = await image.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const safeFileName = `${memoryDate || "memory"}_${image.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        )}`;
        const fileId = await uploadImageToDrive({
          buffer,
          mimeType: image.type || "image/jpeg",
          fileName: safeFileName,
          memoryDate: /^\d{4}-\d{2}-\d{2}$/.test(memoryDate)
            ? memoryDate
            : undefined,
        });
        driveFileIds = [fileId];
      }
    }

    if (driveFileIds.length === 0) {
      return NextResponse.json(
        { error: "Please choose at least one photo to plant with this memory." },
        { status: 400 }
      );
    }

    if (!note) {
      return NextResponse.json(
        { error: "Please write a little note for this memory." },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(memoryDate)) {
      return NextResponse.json(
        { error: "Please select a valid date (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    if (unlockDate && !/^\d{4}-\d{2}-\d{2}$/.test(unlockDate)) {
      return NextResponse.json(
        { error: "Please select a valid Time Capsule unlock date." },
        { status: 400 }
      );
    }

    const monthKey = memoryDate.slice(0, 7);
    const primaryFileId = driveFileIds[0];
    const fileIdsJson = JSON.stringify(driveFileIds);

    await ensureMemoriesTable();
    const pool = getDbPool();

    const [insertResult] = await pool.execute<ResultSetHeader>(
      `INSERT INTO memories (memory_date, month_key, note, drive_file_id, drive_file_ids, uploaded_by, mood, unlock_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        memoryDate,
        monthKey,
        note,
        primaryFileId,
        fileIdsJson,
        uploadedBy,
        mood,
        unlockDate,
      ]
    );

    const [rows] = await pool.execute<MemoryRow[]>(
      `SELECT id, memory_date, month_key, note, drive_file_id, drive_file_ids, uploaded_by, mood, unlock_date, created_at
       FROM memories
       WHERE id = ?`,
      [insertResult.insertId]
    );

    return NextResponse.json(
      { memory: serializeMemory(rows[0], []) },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/memories error:", error);
    return NextResponse.json(
      { error: "Failed to plant your memory. Please try again." },
      { status: 500 }
    );
  }
}
