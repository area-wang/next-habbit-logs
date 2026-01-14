"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm: () => void;
	loading?: boolean;
	variant?: "danger" | "warning" | "info";
}

export default function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmText = "确认",
	cancelText = "取消",
	onConfirm,
	loading = false,
	variant = "danger",
}: ConfirmDialogProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// 阻止背景滚动
	useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [open]);

	const variantStyles = {
		danger: "bg-red-600 hover:bg-red-700",
		warning: "bg-amber-600 hover:bg-amber-700",
		info: "bg-purple-600 hover:bg-purple-700",
	};

	const handleCancel = () => {
		onOpenChange(false);
	};

	const handleConfirm = () => {
		if (!loading) {
			onConfirm();
			onOpenChange(false);
		}
	};

	if (!open || !mounted) return null;

	const dialog = (
		<div 
			className="fixed inset-0 flex items-center justify-center"
			style={{ 
				zIndex: 99999,
				pointerEvents: 'auto',
			}}
			onMouseDown={(e) => e.stopPropagation()}
			onMouseUp={(e) => e.stopPropagation()}
			onClick={(e) => e.stopPropagation()}
			onTouchStart={(e) => e.stopPropagation()}
			onTouchEnd={(e) => e.stopPropagation()}
		>
			{/* Overlay */}
			<div 
				className="absolute inset-0 bg-black/30"
				onMouseDown={(e) => {
					e.stopPropagation();
					handleCancel();
				}}
			/>
			
			{/* Content */}
			<div 
				className="relative bg-[color:var(--background)] border border-[color:var(--border-color)] rounded-2xl p-4 sm:p-6 w-[90vw] max-w-sm shadow-xl"
				style={{ zIndex: 100000 }}
				onMouseDown={(e) => e.stopPropagation()}
				onMouseUp={(e) => e.stopPropagation()}
				onClick={(e) => e.stopPropagation()}
			>
				<h2 className="text-base sm:text-lg font-semibold mb-2">
					{title}
				</h2>
				<p className="opacity-70 mb-4 text-sm sm:text-base">
					{description}
				</p>
				<div className="flex gap-2 sm:gap-3 justify-end">
					<button
						type="button"
						onMouseDown={(e) => {
							e.stopPropagation();
							e.preventDefault();
							handleCancel();
						}}
						disabled={loading}
						className="px-3 sm:px-4 py-2 text-xs sm:text-sm opacity-70 hover:opacity-100 transition-opacity disabled:opacity-50"
					>
						{cancelText}
					</button>
					<button
						type="button"
						onMouseDown={(e) => {
							e.stopPropagation();
							e.preventDefault();
							handleConfirm();
						}}
						disabled={loading}
						className={`px-3 sm:px-4 py-2 text-xs sm:text-sm text-white rounded-xl disabled:opacity-50 transition-colors ${variantStyles[variant]}`}
					>
						{loading ? "处理中..." : confirmText}
					</button>
				</div>
			</div>
		</div>
	);

	return createPortal(dialog, document.body);
}
