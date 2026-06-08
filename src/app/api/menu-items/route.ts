import { NextResponse } from "next/server";
import { getAllMenuItems, upsertMenuItems } from "@/lib/db/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getAllMenuItems();
    return NextResponse.json(items);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const items = await request.json();
    await upsertMenuItems(items);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
