"use client";

import { useState } from "react";
import ReflectionEditModal from "./reflection-edit-modal";
import ConfirmDialog from "@/components/confirm-dialog";

interface Reflection {
	id: string;
	title: string | null;
	tags: string[];
	sideTags?: any[];
	content: string;
	createdAt: number;
	updatedAt: number;
}

export default function ReflectionCard({
	reflection,
	onUpdate,
	onDelete,
}: {
	reflection: Reflection;
	onUpdate: () => void;
	onDelete: () => void;
}) {
	const [showEditModal, setShowEditModal] = useState(false);
	const [loading, setLoading] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleDelete() {
		setLoading(true);
		try {
			const res = await fetch(`/api/reflections/${reflection.id}`, {
				method: "DELETE",
			});

			if (!res.ok) throw new Error("删除失败");

			onDelete();
			setShowDeleteConfirm(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "删除失败");
		} finally {
			setLoading(false);
		}
	}

	const time = new Date(reflection.createdAt).toLocaleTimeString("zh-CN", {
		hour: "2-digit",
		minute: "2-digit",
	});

	// 提取日期用于编辑
	const date = new Date(reflection.createdAt).toISOString().split("T")[0];

	return (
		<>
			<div className="border border-[color:var(--border-color)] bg-[color:var(--surface)] rounded-2xl p-4 transition-all hover:bg-[color:var(--surface-strong)] cursor-pointer"
				onClick={() => setShowEditModal(true)}
			>
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-2">
						<span className="text-xs opacity-70">{time}</span>
					</div>

					<div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
						<button
							onClick={() => setShowEditModal(true)}
							className="p-2 rounded-lg hover:bg-[color:var(--surface-strong)] transition-colors group"
							title="编辑"
						>
							<svg
								className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
								/>
							</svg>
						</button>
						<button
							onClick={() => setShowDeleteConfirm(true)}
							className="p-2 rounded-lg hover:bg-red-50 transition-colors group"
							title="删除"
						>
							<svg
								className="w-4 h-4 text-red-600 opacity-60 group-hover:opacity-100 transition-opacity"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
								/>
							</svg>
						</button>
					</div>
				</div>

				<div>
					{reflection.title && (
						<h3 className="font-medium text-lg mb-2">{reflection.title}</h3>
					)}
					<p className="whitespace-pre-wrap line-clamp-3">{reflection.content}</p>
				</div>
			</div>

			<ReflectionEditModal
				open={showEditModal}
				onClose={() => setShowEditModal(false)}
				date={date}
				reflectionId={reflection.id}
				onSuccess={onUpdate}
			/>

			<ConfirmDialog
				open={showDeleteConfirm}
				onOpenChange={setShowDeleteConfirm}
				title="确认删除"
				description="确定要删除这条反思吗？此操作无法撤销。"
				confirmText="删除"
				onConfirm={handleDelete}
				loading={loading}
				variant="danger"
			/>

			{error && (
				<div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-xl shadow-lg z-50">
					{error}
				</div>
			)}
		</>
	);
}

