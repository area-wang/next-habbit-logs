"use client";

export default function LogoutButton() {
	return (
		<button
			className="text-sm px-3 py-1.5 rounded-full border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
			onClick={async () => {
				await fetch("/api/auth/logout", { method: "POST" });
				window.location.href = "/login";
			}}
		>
			退出
		</button>
	);
}
