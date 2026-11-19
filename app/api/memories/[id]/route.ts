import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2/promise";
import { getAuthenticatedSession } from "@/src/lib/auth";
import {
  ensureMemoriesTable,
  getDbPool,
  MemoryRow,
  parseDriveFileIds,
} from "@/src/lib/db";
import { deleteImageFromDrive } from "@/src/lib/googleDrive";

export async function DELETE(
  _request: NextRequest,
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

    await ensureMemoriesTable();
    const pool = getDbPool();

    const [existingRows] = await pool.execute<MemoryRow[]>(
      `SELECT drive_file_id, drive_file_ids FROM memories WHERE id = ?`,
      [memoryId]
    );

    if (existingRows.length === 0) {
      return NextResponse.json({ error: "Memory not found." }, { status: 404 });
    }

    const fileIdsToDelete = parseDriveFileIds(
      existingRows[0].drive_file_ids,
      existingRows[0].drive_file_id
    );

    const [deleteResult] = await pool.execute<ResultSetHeader>(
      `DELETE FROM memories WHERE id = ?`,
      [memoryId]
    );

    if (deleteResult.affectedRows === 0) {
      return NextResponse.json({ error: "Memory not found." }, { status: 404 });
    }

    await pool.execute(`DELETE FROM memory_replies WHERE memory_id = ?`, [memoryId]);

    // Best-effort cleanup of all attached photos in Google Drive
    await Promise.all(fileIdsToDelete.map((fid) => deleteImageFromDrive(fid)));

    return NextResponse.json({ ok: true, id: memoryId });
  } catch (error) {
    console.error("DELETE /api/memories/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to remove memory." },
      { status: 500 }
    );
  }
}
