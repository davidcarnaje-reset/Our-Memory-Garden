import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise";
import { getAuthenticatedSession } from "@/src/lib/auth";
import {
  ensureMemoriesTable,
  getDbPool,
  MemoryReplyRow,
  MemoryRow,
} from "@/src/lib/db";

const ALLOWED_REACTIONS = new Set(["❤️", "🥺", "😂"]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const memoryId = Number(id);
    if (!Number.isInteger(memoryId) || memoryId <= 0) {
      return NextResponse.json({ error: "Invalid memory ID." }, { status: 400 });
    }

    const body = await request.json();
    const message =
      typeof body?.message === "string" ? body.message.trim().slice(0, 1000) : "";
    const reaction =
      typeof body?.reaction === "string" && ALLOWED_REACTIONS.has(body.reaction)
        ? body.reaction
        : null;
    const author =
      typeof body?.author === "string" && body.author.trim()
        ? body.author.trim().slice(0, 50)
        : session.uploadedBy;

    if (!message && !reaction) {
      return NextResponse.json(
        { error: "Please write a note or pick a reaction." },
        { status: 400 }
      );
    }

    await ensureMemoriesTable();
    const pool = getDbPool();

    const [memRows] = await pool.execute<MemoryRow[]>(
      `SELECT id FROM memories WHERE id = ?`,
      [memoryId]
    );
    if (memRows.length === 0) {
      return NextResponse.json({ error: "Memory not found." }, { status: 404 });
    }

    const [insertResult] = await pool.execute<ResultSetHeader>(
      `INSERT INTO memory_replies (memory_id, author, message, reaction)
       VALUES (?, ?, ?, ?)`,
      [memoryId, author, message, reaction]
    );

    const [replyRows] = await pool.execute<MemoryReplyRow[]>(
      `SELECT id, memory_id, author, message, reaction, created_at
       FROM memory_replies
       WHERE id = ?`,
      [insertResult.insertId]
    );

    return NextResponse.json({ reply: replyRows[0] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/memories/[id]/replies error:", error);
    return NextResponse.json(
      { error: "Failed to post love note." },
      { status: 500 }
    );
  }
}
