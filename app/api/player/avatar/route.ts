import { NextRequest, NextResponse } from "next/server";
import { StorageService } from "@/lib/storage/storage-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { address, avatar } = await request.json();

    if (!address || !avatar) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const storage = new StorageService();

    // Get existing profile
    const profile = await storage.getProfile(address);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Update avatar
    profile.avatar = avatar;

    // Save updated profile
    await storage.saveProfile(profile);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating avatar:", error);
    return NextResponse.json(
      { error: "Failed to update avatar" },
      { status: 500 },
    );
  }
}
