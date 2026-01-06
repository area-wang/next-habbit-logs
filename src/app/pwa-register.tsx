"use client";

import { useEffect } from "react";

export default function PwaRegister() {
	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!("serviceWorker" in navigator)) return;
		if (process.env.NODE_ENV !== "production") {
			navigator.serviceWorker
				.getRegistrations()
				.then((regs) => Promise.all(regs.map((r) => r.unregister())))
				.catch(() => undefined);
			if ("caches" in window) {
				caches
					.keys()
					.then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
					.catch(() => undefined);
			}
			return;
		}
		navigator.serviceWorker.register("/sw.js").catch(() => undefined);
	}, []);
	return null;
}
