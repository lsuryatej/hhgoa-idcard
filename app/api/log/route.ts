import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("\n==================== CLIENT DEBUG LOG ====================");
    console.log(`Tag: ${data.tag}`);
    console.log(`Time: ${data.time}`);
    console.log(`UserAgent: ${data.userAgent}`);
    console.log("Details:", JSON.stringify(data.details, null, 2));
    console.log("==========================================================\n");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
