import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

/**
 * GET /api/qrcode?url=https://svmoments.vercel.app
 * Returns a high-res PNG QR code
 */
export async function GET(request: NextRequest) {
  const url =
    request.nextUrl.searchParams.get("url") || "https://svmoments.vercel.app";

  try {
    const buffer = await QRCode.toBuffer(url, {
      type: "png",
      width: 1024,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="wedding-qr.png"`,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (err) {
    console.error("QR generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
