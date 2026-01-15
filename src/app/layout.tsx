import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Serif_SC } from "next/font/google";
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
	themeColor: "#fff8db",
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
				<PwaRegister />
				{children}
			</body>
		</html>
	);
}
