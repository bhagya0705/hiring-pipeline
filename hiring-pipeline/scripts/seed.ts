import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "../db/db.js";

const users = [
    {
        name: "Demo Recruiter",
        email: "recruiter@example.com",
        password: "recruiter123",
        role: "RECRUITER",
    },
    {
        name: "Demo Interviewer",
        email: "interviewer1@example.com",
        password: "interviewer123",
        role: "INTERVIEWER",
    },
    {
        name: "Second Interviewer",
        email: "interviewer2@example.com",
        password: "interviewer123",
        role: "INTERVIEWER",
    },
];

async function seed() {
    try {
        for (const user of users) {
            const passwordHash = await bcrypt.hash(user.password, 10);

            await pool.query(
                `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING
        `,
                [user.name, user.email, passwordHash, user.role]
            );
        }

        console.log("Seed completed successfully.");
    } catch (error) {
        console.error("Seed failed:", error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seed();