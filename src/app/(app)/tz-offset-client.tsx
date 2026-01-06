"use client";

import { useEffect } from "react";

export default function TzOffsetClient() {
	useEffect(() => {
		try {
			const offsetMinutes = -new Date().getTimezoneOffset();
			document.cookie = `tzOffsetMin=${encodeURIComponent(String(offsetMinutes))}; Path=/; Max-Age=31536000; SameSite=Lax`;
		} catch {
			// ignore
		}
	}, []);

	return null;
}
