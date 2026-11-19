import { NextResponse } from "next/server";
import {
  createSessionToken,
  getAuthenticatedSession,
  SESSION_COOKIE_NAME,
  verifyPasscode,
} from "@/src/lib/auth";

export async function GET() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
  return NextResponse.json({
    authenticated: true,
    uploadedBy: session.uploadedBy,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const passcode = typeof body?.passcode === "string" ? body.passcode : "";
    const uploadedBy =
      typeof body?.uploadedBy === "string" && body.uploadedBy.trim()
        ? body.uploadedBy.trim().slice(0, 50)
        : "Me";

    if (!passcode) {
      return NextResponse.json(
        { error: "Please enter our secret passcode." },
        { status: 400 }
      );
    }

    if (!verifyPasscode(passcode)) {
      return NextResponse.json(
        { error: "That passcode doesn't match our garden key." },
        { status: 401 }
      );
    }

    const token = createSessionToken(uploadedBy);
    const response = NextResponse.json({
      ok: true,
      uploadedBy,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    response.cookies.set({
      name: "garden_auth",
      value: "authenticated",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Unable to verify passcode right now." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set({
    name: "garden_auth",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
