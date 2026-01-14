import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Serif_SC } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import PwaRegister from "./pwa-register";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const notoSerifSC = Noto_Serif_SC({
	variable: "--font-noto-serif-sc",
	subsets: ["latin"],
	weight: ["300", "500", "700"],
});

export const metadata: Metadata = {
	title: "爱你老己",
	description: "计划 + 习惯：让执行变成系统",
	manifest: "/manifest.webmanifest",
	icons: {
		icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
		apple: [{ url: "/logo.svg", type: "image/svg+xml" }],
	},
};

export const viewport: Viewport = {
	themeColor: "#0b0b0c",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link
					href="https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${notoSerifSC.variable} antialiased`}
			>
				<Script id="theme-init" strategy="beforeInteractive">
					{`
						(function () {
							try {
								var t = window.localStorage.getItem('theme');
								var root = document.documentElement;
								if (t === 'butter') {
									root.classList.remove('dark');
									root.classList.add('theme-butter');
								} else {
									root.classList.add('dark');
									root.classList.remove('theme-butter');
								}
							} catch (e) {
								try {
									document.documentElement.classList.add('dark');
								} catch (e2) {
									// ignore
								}
							}
						})();
					`}
				</Script>
				<PwaRegister />
				{children}
			</body>
		</html>
	);
}
