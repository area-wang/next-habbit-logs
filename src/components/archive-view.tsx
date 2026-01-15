"use client";

import { HabitWithCategory } from "@/lib/types";
import { useState, useMemo } from "react";
import ConfirmDialog from "./confirm-dialog";

interface ArchiveViewProps {
	archivedHabits: HabitWithCategory[];
	onRestore: (habitId: string) => Promise<void>;
	onDelete: (habitId: string) => Promise<void>;
	onRefresh: () => void;
}

export default function ArchiveView({
	archivedHabits,
	onRestore,
	onDelete,
	onRefresh,
}: ArchiveViewProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState<"archived_at" | "title">("archived_at");
	const [loading, setLoading] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState<HabitWithCategory | null>(null);

	const filteredHabits = useMemo(() => {
		let filtered = archivedHabits;

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(h) =>
					h.title.toLowerCase().includes(query) ||
					h.description?.toLowerCase().includes(query) ||
					h.parsedTags?.some((tag) => tag.toLowerCase().includes(query))
			);
		}

		return filtered.sort((a, b) => {
			if (sortBy === "archived_at") {
				return (b.archived_at || 0) - (a.archived_at || 0);
			}
			return a.title.localeCompare(b.title);
		});
	}, [archivedHabits, searchQuery, sortBy]);

	const handleRestore = async (habit: HabitWithCategory) => {
		setLoading(habit.id);
		try {
			await onRestore(habit.id);
			onRefresh();
		} finally {
			setLoading(null);
		}
	};

	const handleDelete = async (habit: HabitWithCategory) => {
		setLoading(habit.id);
		try {
			await onDelete(habit.id);
			setConfirmDelete(null);
			onRefresh();
		} finally {
			setLoading(null);
		}
	};

	const formatDate = (timestamp: number | null) => {
		if (!timestamp) return "";
		const date = new Date(timestamp);
		return date.toLocaleDateString("zh-CN", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<input
					className="flex-1 h-10 text-sm rounded-xl border border-black/10 bg-transparent px-3 outline-none"
					placeholder="搜索归档的习惯..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
				<select
					className="h-10 px-3 rounded-xl border border-black/10 bg-transparent text-sm outline-none cursor-pointer"
					value={sortBy}
					onChange={(e) => setSortBy(e.target.value as "archived_at" | "title")}
				>
					<option value="archived_at">按归档时间</option>
					<option value="title">按标题</option>
				</select>
			</div>

			{filteredHabits.length === 0 ? (
				<div className="text-center py-12">
					<div className="text-4xl mb-3">📦</div>
					<div className="text-sm opacity-70">
						{searchQuery ? "没有找到匹配的归档习惯" : "暂无归档的习惯"}
					</div>
				</div>
			) : (
				<div className="space-y-2">
					{filteredHabits.map((habit) => (
						<div
							key={habit.id}
							className="rounded-xl border border-black/10 p-4"
						>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 mb-1">
										{habit.category && (
											<span
												className="w-3 h-3 rounded-full flex-shrink-0"
												style={{ backgroundColor: habit.category.color }}
												title={habit.category.name}
											/>
										)}
										<div className="font-medium break-words">{habit.title}</div>
									</div>
									{habit.description && (
										<div className="text-sm opacity-70 mb-2">{habit.description}</div>
									)}
									{habit.parsedTags && habit.parsedTags.length > 0 && (
										<div className="flex flex-wrap gap-1 mb-2">
											{habit.parsedTags.map((tag, idx) => (
												<span
													key={idx}
													className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs"
												>
													{tag}
												</span>
											))}
										</div>
									)}
									<div className="text-xs opacity-60">
										归档于：{formatDate(habit.archived_at)}
									</div>
								</div>
								<div className="flex items-center gap-2 flex-shrink-0">
									<button
										className="h-9 px-3 inline-flex items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 transition-colors text-sm"
										onClick={() => handleRestore(habit)}
										disabled={loading === habit.id}
										title="恢复习惯"
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mr-1">
											<path
												d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
											<path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
										</svg>
										恢复
									</button>
									<button
										className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-red-200 hover:bg-red-50 transition-colors text-red-600"
										onClick={() => setConfirmDelete(habit)}
										disabled={loading === habit.id}
										title="永久删除"
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
											<path
												d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			<ConfirmDialog
				open={confirmDelete !== null}
				onOpenChange={(open) => !open && setConfirmDelete(null)}
				title="确认永久删除"
				description={`确定要永久删除习惯「${confirmDelete?.title}」吗？此操作无法撤销，所有相关数据将被删除。`}
				confirmText="永久删除"
				onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
				loading={loading === confirmDelete?.id}
				variant="danger"
			/>
		</div>
	);
}
