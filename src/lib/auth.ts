import { getDb, getEnv } from "@/lib/db";
import { bytesToBase64, base64ToBytes, pbkdf2Sha256, randomTokenBase64Url, sha256Base64 } from "@/lib/crypto";

const SESSION_COOKIE_NAME = "session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 100_000;

function getSessionTokenHash(token: string) {
	void getEnv();
	return sha256Base64(token);
}

export type AuthedUser = {
	id: string;
	email: string;
	name: string | null;
};

export function getSessionCookieName() {
	return SESSION_COOKIE_NAME;
}

export function parseSessionTokenFromCookieHeader(cookieHeader: string | null) {
	if (!cookieHeader) return null;
	const parts = cookieHeader.split(";");
	for (const part of parts) {
		const [k, ...rest] = part.trim().split("=");
		if (k === SESSION_COOKIE_NAME) return rest.join("=") || null;
	}
	return null;
}

export async function hashPassword(password: string) {
	const salt = new Uint8Array(16);
	crypto.getRandomValues(salt);
	const derived = await pbkdf2Sha256(password, salt, PASSWORD_ITERATIONS, 256);
	return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(derived)}`;
}

export async function verifyPassword(password: string, stored: string) {
	const [algo, iterStr, saltB64, hashB64] = stored.split("$");
	if (algo !== "pbkdf2_sha256") return false;
	const iterations = Number(iterStr);
	if (!Number.isFinite(iterations) || iterations <= 0) return false;
	const salt = base64ToBytes(saltB64);
	const expected = base64ToBytes(hashB64);
	const derived = await pbkdf2Sha256(password, salt, iterations, expected.length * 8);
	if (derived.length !== expected.length) return false;
	let ok = 0;
	for (let i = 0; i < derived.length; i++) ok |= derived[i] ^ expected[i];
	return ok === 0;
}

export async function createSession(userId: string) {
	const token = randomTokenBase64Url(32);
	const tokenHash = await getSessionTokenHash(token);
	const now = Date.now();
	const expiresAt = now + SESSION_TTL_MS;
	const sessionId = crypto.randomUUID();
	await getDb()
		.prepare("INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
		.bind(sessionId, userId, tokenHash, now, expiresAt)
		.run();
	return { token, expiresAt };
}

export async function deleteSessionByToken(token: string) {
	const tokenHash = await getSessionTokenHash(token);
	await getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
}

export async function getUserBySessionToken(token: string) {
	const tokenHash = await getSessionTokenHash(token);
	const now = Date.now();
	const res = await getDb()
		.prepare(
			"SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? LIMIT 1",
		)
		.bind(tokenHash, now)
		.all();
	const row = (res.results?.[0] as any) || null;
	if (!row) return null;
	return { id: String(row.id), email: String(row.email), name: row.name ? String(row.name) : null } satisfies AuthedUser;
}

export async function cleanupExpiredSessions() {
	const now = Date.now();
	await getDb().prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(now).run();
}
