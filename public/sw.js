const CACHE_NAME = "exec-log-v1";

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) =>
			cache.addAll(["/manifest.webmanifest", "/favicon.ico"]).catch(() => undefined),
		),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.map((k) => (k === CACHE_NAME ? Promise.resolve() : caches.delete(k)))),
		),
	);
});

self.addEventListener("fetch", (event) => {
	const req = event.request;
	if (req.method !== "GET") return;

	const url = new URL(req.url);
	if (url.origin !== self.location.origin) return;
	if (url.pathname.startsWith("/api/")) return;
	if (req.mode === "navigate") {
		event.respondWith(fetch(req));
		return;
	}

	const dest = req.destination;
	const isAsset = dest === "script" || dest === "style" || dest === "image" || dest === "font";
	const isNextAsset = url.pathname.startsWith("/_next/");

	if (isAsset || isNextAsset) {
		event.respondWith(
			caches.match(req).then((cached) => {
				if (cached) return cached;
				return fetch(req)
					.then((res) => {
						const copy = res.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => undefined);
						return res;
					})
					.catch(() => cached);
			}),
		);
		return;
	}

	event.respondWith(fetch(req));
});

self.addEventListener("push", (event) => {
	let payload = {};
	try {
		payload = event.data ? event.data.json() : {};
	} catch {
		payload = { title: "爱你老己", body: event.data ? String(event.data.text()) : "" };
	}
	try {
		if (!payload.title && typeof payload.data === "string") {
			const parsed = JSON.parse(payload.data);
			if (parsed && typeof parsed === "object") payload = parsed;
		}
	} catch {
		// ignore
	}
	const title = payload.title || "爱你老己";
	const body = payload.body || "你有一个待开始的任务/习惯";
	const url = payload.url || (payload.data && payload.data.url) || null;
	event.waitUntil(self.registration.showNotification(title, { body, data: { url } }));
});

self.addEventListener("notificationclick", (event) => {
	try {
		event.notification.close();
	} catch {
		// ignore
	}
	const rawUrl = event?.notification?.data?.url;
	if (!rawUrl) return;
	let url = rawUrl;
	try {
		url = new URL(String(rawUrl), self.location.origin).href;
	} catch {
		// ignore
	}
	event.waitUntil(
		clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clientList) => {
				for (const client of clientList) {
					try {
						if (!client) continue;
						const clientUrl = String(client.url || "");
						if (clientUrl) {
							if (clientUrl === url || clientUrl.startsWith(url)) {
								if ("focus" in client) return client.focus();
								return client;
							}
							if (clientUrl.startsWith(self.location.origin)) {
								if ("focus" in client) {
									return client.focus().then(() => {
										try {
											if ("navigate" in client) return client.navigate(url);
										} catch {
											// ignore
										}
										return client;
									});
								}
								try {
									if ("navigate" in client) return client.navigate(url);
								} catch {
									// ignore
								}
								return client;
							}
						}
					} catch {
						// ignore
					}
				}
				return clients.openWindow(url);
			})
			.catch(() => clients.openWindow(url)),
	);
});
