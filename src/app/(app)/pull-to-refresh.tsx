"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function PullToRefresh() {
	const router = useRouter();
	const [pull, setPull] = useState(0);
	const [refreshing, setRefreshing] = useState(false);
	const startYRef = useRef<number | null>(null);
	const pullingRef = useRef(false);
	const rafRef = useRef<number | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;

		function setPullRaf(v: number) {
			if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
			rafRef.current = requestAnimationFrame(() => setPull(v));
		}

		function onTouchStart(e: TouchEvent) {
			if (refreshing) return;
			if (window.scrollY > 0) return;
			const t = e.touches[0];
			if (!t) return;
			startYRef.current = t.clientY;
			pullingRef.current = true;
			setPullRaf(0);
		}

		function onTouchMove(e: TouchEvent) {
			if (!pullingRef.current) return;
			if (refreshing) return;
			const startY = startYRef.current;
			const t = e.touches[0];
			if (startY == null || !t) return;
			const dy = t.clientY - startY;
			if (dy <= 0) {
				setPullRaf(0);
				return;
			}
			if (window.scrollY > 0) {
				pullingRef.current = false;
				setPullRaf(0);
				return;
			}
			setPullRaf(Math.min(72, dy));
		}

		async function finish(shouldRefresh: boolean) {
			pullingRef.current = false;
			startYRef.current = null;
			if (shouldRefresh) {
				setRefreshing(true);
				setPull(56);
				try {
					router.refresh();
					await new Promise((r) => setTimeout(r, 600));
				} finally {
					setRefreshing(false);
					setPull(0);
				}
			} else {
				setPull(0);
			}
		}

		function onTouchEnd() {
			if (!pullingRef.current) return;
			const shouldRefresh = pull >= 56;
			void finish(shouldRefresh);
		}

		window.addEventListener("touchstart", onTouchStart, { passive: true });
		window.addEventListener("touchmove", onTouchMove, { passive: true });
		window.addEventListener("touchend", onTouchEnd, { passive: true });
		window.addEventListener("touchcancel", onTouchEnd, { passive: true });
		return () => {
			window.removeEventListener("touchstart", onTouchStart);
			window.removeEventListener("touchmove", onTouchMove);
			window.removeEventListener("touchend", onTouchEnd);
			window.removeEventListener("touchcancel", onTouchEnd);
			if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
		};
	}, [router, refreshing, pull]);

	const visible = pull > 0 || refreshing;
	return (
		<div
			aria-hidden={!visible}
			className="fixed left-0 right-0 top-0 z-40 pointer-events-none"
			style={{
				opacity: visible ? 1 : 0,
				transform: `translateY(${Math.max(-40, -40 + pull)}px)`,
				transition: refreshing ? "none" : "transform 120ms ease",
			}}
		>
			<div className="mx-auto mt-2 w-fit rounded-full border border-[color:var(--border-color)] bg-[color:var(--popover-bg)] backdrop-blur px-3 py-1 text-xs opacity-80">
				{refreshing ? "刷新中..." : pull >= 56 ? "松手刷新" : "下拉刷新"}
			</div>
		</div>
	);
}
