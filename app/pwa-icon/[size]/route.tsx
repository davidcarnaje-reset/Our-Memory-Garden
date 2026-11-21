import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ size: string }> }
) {
  const { size: rawSize } = await context.params;
  const size = rawSize === "512" ? 512 : 192;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAF6F0",
          borderRadius: Math.round(size * 0.22),
        }}
      >
        <svg
          width={Math.round(size * 0.78)}
          height={Math.round(size * 0.78)}
          viewBox="0 0 64 64"
        >
          <path
            d="M32 45 C22 45 16 50 15 55 C23 55 29 51 32 45 Z"
            fill="#6D8C70"
          />
          <path
            d="M32 45 C42 45 48 50 49 55 C41 55 35 51 32 45 Z"
            fill="#82A385"
          />
          <path
            d="M32 34 L32 54"
            stroke="#5B7A5F"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="32" cy="15" r="7.5" fill="#E28B90" />
          <circle cx="41.5" cy="20.5" r="7.5" fill="#E89FA3" />
          <circle cx="41.5" cy="31.5" r="7.5" fill="#E28B90" />
          <circle cx="32" cy="37" r="7.5" fill="#E89FA3" />
          <circle cx="22.5" cy="31.5" r="7.5" fill="#E28B90" />
          <circle cx="22.5" cy="20.5" r="7.5" fill="#E89FA3" />
          <circle cx="32" cy="26" r="6.5" fill="#F2C864" />
        </svg>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }
  );
}
