const encoder = new TextEncoder();

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function bytesToBase64(bytes: Uint8Array) {
	let s = "";
	for (const b of bytes) s += String.fromCharCode(b);
	return btoa(s);
}

export function base64ToBytes(b64: string) {
	const s = atob(b64);
	const out = new Uint8Array(s.length);
	for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
	return out;
}

export function bytesToBase64Url(bytes: Uint8Array) {
	return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function base64UrlToBytes(b64url: string) {
	let b64 = b64url.replaceAll("-", "+").replaceAll("_", "/");
	while (b64.length % 4 !== 0) b64 += "=";
	return base64ToBytes(b64);
}

export function randomTokenBase64Url(byteLen = 32) {
	const bytes = new Uint8Array(byteLen);
	crypto.getRandomValues(bytes);
	return bytesToBase64Url(bytes);
}

export async function pbkdf2Sha256(password: string, salt: Uint8Array, iterations: number, bits: number) {
	const key = await crypto.subtle.importKey(
		"raw",
		toArrayBuffer(encoder.encode(password)),
		{ name: "PBKDF2" },
		false,
		["deriveBits"],
	);
	const derived = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", salt: toArrayBuffer(salt), iterations, hash: "SHA-256" },
		key,
		bits,
	);
	return new Uint8Array(derived);
}

export async function hmacSha256Base64(secret: string, message: string) {
	const key = await crypto.subtle.importKey(
		"raw",
		toArrayBuffer(encoder.encode(secret)),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, toArrayBuffer(encoder.encode(message)));
	return bytesToBase64(new Uint8Array(sig));
}
