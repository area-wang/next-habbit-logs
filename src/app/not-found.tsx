import Link from "next/link";

export default function NotFound() {
	return (
		<div className="min-h-screen flex items-center justify-center px-4">
			<div className="max-w-md w-full text-center space-y-6">
				<div className="space-y-2">
					<div className="text-8xl font-bold text-purple-600">404</div>
					<h1 className="text-2xl font-semibold">页面不存在</h1>
					<p className="text-sm opacity-70">
						抱歉，你访问的页面不存在或已被移除。
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-3 justify-center">
					<Link
						href="/today"
						className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
					>
						返回今日
					</Link>
					<Link
						href="/habits"
						className="px-6 py-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors font-medium"
					>
						查看习惯
					</Link>
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
							d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
						/>
					</svg>
				</div>
			</div>
		</div>
	);
}
