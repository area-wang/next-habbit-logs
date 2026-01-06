import { Suspense } from "react";
import LoginClient from "./login-client";

export default function LoginPage() {
	return (
		<Suspense
			fallback={<div className="min-h-screen flex items-center justify-center p-6 text-sm opacity-70">加载中...</div>}
		>
			<LoginClient />
		</Suspense>
	);
}
