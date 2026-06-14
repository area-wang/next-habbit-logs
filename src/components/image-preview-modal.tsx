"use client";

import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

interface ImagePreviewModalProps {
	images: string[];
	currentIndex: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onNavigate: (index: number) => void;
}

export default function ImagePreviewModal({
	images,
	currentIndex,
	open,
	onOpenChange,
	onNavigate,
}: ImagePreviewModalProps) {
	useEffect(() => {
		if (!open) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft" && currentIndex > 0) {
				onNavigate(currentIndex - 1);
			} else if (e.key === "ArrowRight" && currentIndex < images.length - 1) {
				onNavigate(currentIndex + 1);
			} else if (e.key === "Escape") {
				onOpenChange(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open, currentIndex, images.length, onNavigate, onOpenChange]);

	if (!images[currentIndex]) return null;

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/90 z-50 animate-in fade-in" />
				<Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<VisuallyHidden.Root>
						<Dialog.Title>图片预览</Dialog.Title>
					</VisuallyHidden.Root>
					<div className="relative w-full h-full flex items-center justify-center">
						{/* 关闭按钮 */}
						<button
							className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
							onClick={() => onOpenChange(false)}
							aria-label="关闭"
						>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
								<path
									d="M18 6L6 18M6 6l12 12"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
								/>
							</svg>
						</button>

						{/* 图片计数 */}
						{images.length > 1 && (
							<div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-sm">
								{currentIndex + 1} / {images.length}
							</div>
						)}

						{/* 左箭头 */}
						{currentIndex > 0 && (
							<button
								className="absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
								onClick={() => onNavigate(currentIndex - 1)}
								aria-label="上一张"
							>
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
									<path
										d="M15 18l-6-6 6-6"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</button>
						)}

						{/* 右箭头 */}
						{currentIndex < images.length - 1 && (
							<button
								className="absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
								onClick={() => onNavigate(currentIndex + 1)}
								aria-label="下一张"
							>
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
									<path
										d="M9 18l6-6-6-6"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</button>
						)}

						{/* 图片 */}
						<img
							src={images[currentIndex]}
							alt={`预览 ${currentIndex + 1}`}
							className="max-w-full max-h-full object-contain"
							onClick={(e) => e.stopPropagation()}
						/>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
