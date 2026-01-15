"use client";

import { useEffect } from "react";

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("Application error:", error);
	}, [error]);

	return (
		<div className="min-h-screen flex items-center justify-center px-4">
			<div className="max-w-md w-full text-center space-y-6">
				<div className="space-y-2">
					<div className="text-6xl font-bold text-red-600">错误</div>
					<h1 className="text-2xl font-semibold">出了点问题</h1>
					<p className="text-sm opacity-70">
						应用遇到了一个错误，请尝试刷新页面或返回首页。
					</p>
					{error.digest && (
						<p className="text-xs opacity-50 font-mono">错误代码: {error.digest}</p>
					)}
				</div>

				<div className="flex flex-col sm:flex-row gap-3 justify-center">
					<button
						onClick={reset}
						className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
					>
						重试
					</button>
					<a
						href="/today"
						className="px-6 py-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors font-medium inline-block"
					>
						返回首页
					</a>
				</div>

				<div className="pt-6 opacity-50">
					<svg
						className="w-32 h-32 mx-auto"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
						/>
					</svg>
				</div>
			</div>
		</div>
	);
}
