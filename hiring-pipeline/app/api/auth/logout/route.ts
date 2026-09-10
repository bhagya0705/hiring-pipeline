import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/db/db";

export async function POST() {
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get("session_id")?.value;

        if (sessionId) {
            await pool.query(
                `
                DELETE FROM sessions
                WHERE id = $1
                `,
                [sessionId]
            );
        }

        const response = NextResponse.json({
            message: "Logout successful",
        });

        response.cookies.delete("session_id");

        return response;
    } catch (error) {
        console.error("Logout failed:", error);

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}