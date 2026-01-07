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
		let refreshing = false;
		function askUpdate(reg: ServiceWorkerRegistration) {
			const waiting = reg.waiting;
			if (!waiting) return;
			const ok = window.confirm("检测到新版本，是否立即更新？");
			if (!ok) return;
			waiting.postMessage({ type: "SKIP_WAITING" });
		}

		navigator.serviceWorker.addEventListener("controllerchange", () => {
			if (refreshing) return;
			refreshing = true;
			window.location.reload();
		});

		navigator.serviceWorker
			.register("/sw.js")
			.then((reg) => {
				if (reg.waiting) askUpdate(reg);
				reg.addEventListener("updatefound", () => {
					const installing = reg.installing;
					if (!installing) return;
					installing.addEventListener("statechange", () => {
						if (installing.state === "installed" && navigator.serviceWorker.controller) {
							askUpdate(reg);
						}
					});
				});
				window.addEventListener("visibilitychange", () => {
					if (document.visibilityState === "visible") reg.update().catch(() => undefined);
				});
				const id = window.setInterval(() => reg.update().catch(() => undefined), 30 * 60 * 1000);
				return () => window.clearInterval(id);
			})
			.catch(() => undefined);
	}, []);
	return null;
}
