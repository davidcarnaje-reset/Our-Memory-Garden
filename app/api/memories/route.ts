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
      `SELECT id, memory_date, month_key, note, drive_file_id, uploaded_by, mood, unlock_date, created_at
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

    const today = getTodayIsoDate();
    const memories = rows.map((row) => {
      const isLocked = Boolean(row.unlock_date && row.unlock_date > today);
      return {
        ...row,
        note: isLocked ? "" : row.note,
        drive_file_id: isLocked ? "" : row.drive_file_id,
        replies: repliesByMemoryId[row.id] ?? [],
      };
    });

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
    const moodRaw = formData.get("mood");
    const unlockDateRaw = formData.get("unlock_date");

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

    const mood: MemoryMood =
      typeof moodRaw === "string" && VALID_MOODS.has(moodRaw as MemoryMood)
        ? (moodRaw as MemoryMood)
        : "cozy";

    let unlockDate: string | null = null;
    if (typeof unlockDateRaw === "string" && unlockDateRaw.trim()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(unlockDateRaw.trim())) {
        return NextResponse.json(
          { error: "Please select a valid Time Capsule unlock date." },
          { status: 400 }
        );
      }
      unlockDate = unlockDateRaw.trim();
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
      `INSERT INTO memories (memory_date, month_key, note, drive_file_id, uploaded_by, mood, unlock_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [memoryDate, monthKey, note.trim(), driveFileId, author, mood, unlockDate]
    );

    const [rows] = await pool.execute<MemoryRow[]>(
      `SELECT id, memory_date, month_key, note, drive_file_id, uploaded_by, mood, unlock_date, created_at
       FROM memories
       WHERE id = ?`,
      [insertResult.insertId]
    );

    const created = rows[0];
    const today = getTodayIsoDate();
    const isLocked = Boolean(created.unlock_date && created.unlock_date > today);

    return NextResponse.json(
      {
        memory: {
          ...created,
          note: isLocked ? "" : created.note,
          drive_file_id: isLocked ? "" : created.drive_file_id,
          replies: [],
        },
      },
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
