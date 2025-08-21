import { NextRequest, NextResponse } from "next/server";
import { StorageService } from "@/lib/storage/storage-service";
import { normalizeAddress } from "@/lib/utils/address";

export const dynamic = "force-dynamic";

const storage = new StorageService();

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } },
) {
  try {
    const { address } = params;
    const normalizedAddress = normalizeAddress(address);

    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Get battle history
    const battles = await storage.getBattleHistory(normalizedAddress, limit);

    return NextResponse.json(battles);
  } catch (error) {
    console.error("Error fetching battle history:", error);
    return NextResponse.json(
      { error: "Failed to fetch battle history" },
      { status: 500 },
    );
  }
}
