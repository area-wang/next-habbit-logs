"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Mode = "login" | "signup";

export default function LoginPage() {
	const searchParams = useSearchParams();
	const next = useMemo(() => searchParams.get("next") || "/today", [searchParams]);
	const [mode, setMode] = useState<Mode>("login");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function submit() {
		setError(null);
		setLoading(true);
		try {
			const url = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
			const res = await fetch(url, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(mode === "login" ? { email, password } : { email, password, name }),
			});
			if (!res.ok) {
				const data = (await res.json().catch(() => null)) as any;
				setError(data?.error || "请求失败");
				return;
			}
			window.location.href = next;
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-6">
			<div className="w-full max-w-md border border-black/10 dark:border-white/15 rounded-2xl p-6 bg-white/70 dark:bg-white/5 backdrop-blur">
				<div className="flex items-center justify-between">
					<h1 className="text-xl font-semibold">执行力日志</h1>
					<div className="flex gap-2">
						<button
							className={`text-sm px-3 py-1 rounded-full border ${mode === "login" ? "bg-black text-white border-black" : "border-black/10 dark:border-white/15"}`}
							onClick={() => setMode("login")}
							disabled={loading}
						>
							登录
						</button>
						<button
							className={`text-sm px-3 py-1 rounded-full border ${mode === "signup" ? "bg-black text-white border-black" : "border-black/10 dark:border-white/15"}`}
							onClick={() => setMode("signup")}
							disabled={loading}
						>
							注册
						</button>
					</div>
				</div>

				<div className="mt-6 space-y-3">
					{mode === "signup" ? (
						<label className="block">
							<div className="text-sm mb-1 opacity-80">昵称（可选）</div>
							<input
								className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none"
								value={name}
								onChange={(e) => setName(e.target.value)}
								disabled={loading}
							/>
						</label>
					) : null}

					<label className="block">
						<div className="text-sm mb-1 opacity-80">邮箱</div>
						<input
							className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={loading}
						/>
					</label>

					<label className="block">
						<div className="text-sm mb-1 opacity-80">密码</div>
						<input
							className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							disabled={loading}
						/>
					</label>

					{error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}

					<button
						className="w-full rounded-xl bg-black text-white py-2 font-medium disabled:opacity-60"
						onClick={submit}
						disabled={loading}
					>
						{loading ? "处理中..." : mode === "login" ? "登录" : "注册并进入"}
					</button>
				</div>

				<div className="mt-4 text-xs opacity-70 leading-5">
					<p>目标：把习惯变成可执行的系统，而不是单纯记录。</p>
					<p>提示：密码至少 8 位。</p>
				</div>
			</div>
		</div>
	);
}
