import { NextRequest, NextResponse } from "next/server";
import { createOrder, getNextOrderNumber, getAllOrders, getOrderById, updateOrderStatus } from "@/lib/db/database";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderNum = await getNextOrderNumber();
    const orderId = `ORD-${new Date().getFullYear()}-${String(orderNum).padStart(4, "0")}`;
    const order = {
      id: orderId,
      tableNumber: body.tableNumber || "",
      customerName: body.customerName || "",
      phoneNumber: body.phoneNumber || "",
      specialNotes: body.specialNotes || "",
      items: typeof body.items === "string" ? body.items : JSON.stringify(body.items),
      totalAmount: body.totalAmount || 0,
      paymentMethod: body.paymentMethod || "",
      paymentScreenshot: body.paymentScreenshot || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await createOrder(order);
    return NextResponse.json({ success: true, orderId: order.id, createdAt: order.createdAt });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const order = await getOrderById(id);
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      return NextResponse.json(order);
    }
    const orders = await getAllOrders();
    return NextResponse.json(orders);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, status } = await request.json();
    if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });
    if (!["pending", "verified", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    await updateOrderStatus(id, status);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 400 });
  }
}
