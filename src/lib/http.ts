export function json(data: unknown, init?: ResponseInit) {
	return Response.json(data, init);
}

export function badRequest(message: string) {
	return json({ error: message }, { status: 400 });
}

export function unauthorized() {
	return json({ error: "unauthorized" }, { status: 401 });
}
