import { cookies } from "next/headers";
import { pool } from "@/db/db";

export async function getCurrentUser() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    if (!sessionId) {
        return null;
    }

    const result = await pool.query(
        `
    SELECT
      users.id,
      users.name,
      users.email,
      users.role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.id = $1
      AND sessions.expires_at > NOW()
    `,
        [sessionId]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
}

export async function requireRole(allowedRoles: string[]) {
    const user = await getCurrentUser();

    if (!user) {
        return {
            user: null,
            error: "Unauthorized",
        };
    }

    if (!allowedRoles.includes(user.role)) {
        return {
            user: null,
            error: "Forbidden",
        };
    }

    return {
        user,
        error: null,
    };
}