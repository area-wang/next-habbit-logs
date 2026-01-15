"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Mode = "login" | "signup";

export default function LoginClient() {
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
				credentials: "include",
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
		<div className="min-h-screen flex items-center justify-center p-6 bg-[#fef9f0]">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-purple-600">
						爱你老己
					</h1>
					<p className="text-sm text-gray-600 mt-2">计划 + 习惯：让执行变成系统</p>
				</div>

				<div className="rounded-2xl border border-gray-200 p-6 bg-white shadow-sm">
					<div className="flex gap-2 mb-6">
						<button
							className={`flex-1 text-sm px-4 py-2 rounded-xl font-medium transition-colors ${
								mode === "login"
									? "bg-purple-600 text-white"
									: "border border-gray-200 text-gray-700 hover:bg-gray-50"
							}`}
							onClick={() => setMode("login")}
							disabled={loading}
						>
							登录
						</button>
						<button
							className={`flex-1 text-sm px-4 py-2 rounded-xl font-medium transition-colors ${
								mode === "signup"
									? "bg-purple-600 text-white"
									: "border border-gray-200 text-gray-700 hover:bg-gray-50"
							}`}
							onClick={() => setMode("signup")}
							disabled={loading}
						>
							注册
						</button>
					</div>

					<div className="space-y-4">
						{mode === "signup" ? (
							<label className="block">
								<div className="text-sm mb-2 text-gray-600">昵称（可选）</div>
								<input
									className="w-full h-10 rounded-xl border border-gray-200 bg-transparent px-3 outline-none focus:border-purple-500 transition-colors text-gray-900 placeholder:text-gray-400"
									placeholder="输入你的昵称"
									value={name}
									onChange={(e) => setName(e.target.value)}
									disabled={loading}
								/>
							</label>
						) : null}

						<label className="block">
							<div className="text-sm mb-2 text-gray-600">邮箱</div>
							<input
								className="w-full h-10 rounded-xl border border-gray-200 bg-transparent px-3 outline-none focus:border-purple-500 transition-colors text-gray-900 placeholder:text-gray-400"
								type="email"
								placeholder="your@email.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={loading}
							/>
						</label>

						<label className="block">
							<div className="text-sm mb-2 text-gray-600">密码</div>
							<input
								className="w-full h-10 rounded-xl border border-gray-200 bg-transparent px-3 outline-none focus:border-purple-500 transition-colors text-gray-900 placeholder:text-gray-400"
								type="password"
								placeholder="至少 8 位"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								disabled={loading}
							/>
						</label>

						{error ? (
							<div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-xl border border-red-200">
								{error}
							</div>
						) : null}

						<button
							className="w-full h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							onClick={submit}
							disabled={loading || !email || !password}
						>
							{loading ? "处理中..." : mode === "login" ? "登录" : "注册并进入"}
						</button>
					</div>

					<div className="mt-4 text-xs text-center text-gray-500">
						密码至少需要 8 位字符
					</div>
				</div>
			</div>
		</div>
	);
}
