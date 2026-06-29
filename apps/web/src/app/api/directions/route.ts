import { NextRequest, NextResponse } from "next/server";
import { DirectionsQuerySchema } from "@orbis/validators";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const parsed = DirectionsQuerySchema.safeParse({
    originLng: searchParams.get("originLng"),
    originLat: searchParams.get("originLat"),
    destLng: searchParams.get("destLng"),
    destLat: searchParams.get("destLat"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { originLng, originLat, destLng, destLat } = parsed.data;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?access_token=${token}&overview=false`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    }

    const json = await res.json();
    const route = json.routes?.[0];
    if (!route) {
      return NextResponse.json({ error: "No route found" }, { status: 404 });
    }

    return NextResponse.json({
      distance: `${(route.distance / 1000).toFixed(1)} km`,
      duration: `${Math.ceil(route.duration / 60)} dk`,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch route" }, { status: 500 });
  }
}
