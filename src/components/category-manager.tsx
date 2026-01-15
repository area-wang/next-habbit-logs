"use client";

import { HabitCategory } from "@/lib/types";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import ConfirmDialog from "./confirm-dialog";

interface CategoryManagerProps {
	categories: HabitCategory[];
	onCreateCategory: (category: { name: string; color: string; icon?: string }) => Promise<void>;
	onUpdateCategory: (id: string, updates: { name?: string; color?: string; icon?: string }) => Promise<void>;
	onDeleteCategory: (id: string) => Promise<void>;
}

const PRESET_COLORS = [
	"#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6",
	"#6366F1", "#EF4444", "#14B8A6", "#F97316", "#06B6D4",
];

export default function CategoryManager({
	categories,
	onCreateCategory,
	onUpdateCategory,
	onDeleteCategory,
}: CategoryManagerProps) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [color, setColor] = useState(PRESET_COLORS[0]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState<HabitCategory | null>(null);

	const handleCreate = async () => {
		if (!name.trim()) {
			setError("分类名称不能为空");
			return;
		}
		setLoading(true);
		setError(null);
		try {
			await onCreateCategory({ name: name.trim(), color });
			setName("");
			setColor(PRESET_COLORS[0]);
		} catch (err: any) {
			setError(err.message || "创建失败");
		} finally {
			setLoading(false);
		}
	};

	const handleUpdate = async (id: string) => {
		if (!name.trim()) {
			setError("分类名称不能为空");
			return;
		}
		setLoading(true);
		setError(null);
		try {
			await onUpdateCategory(id, { name: name.trim(), color });
			setEditingId(null);
			setName("");
			setColor(PRESET_COLORS[0]);
		} catch (err: any) {
			setError(err.message || "更新失败");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (category: HabitCategory) => {
		setLoading(true);
		try {
			await onDeleteCategory(category.id);
			setConfirmDelete(null);
		} catch (err: any) {
			setError(err.message || "删除失败");
		} finally {
			setLoading(false);
		}
	};

	const startEdit = (category: HabitCategory) => {
		setEditingId(category.id);
		setName(category.name);
		setColor(category.color);
		setError(null);
	};

	const cancelEdit = () => {
		setEditingId(null);
		setName("");
		setColor(PRESET_COLORS[0]);
		setError(null);
	};

	return (
		<>
			<Dialog.Root open={open} onOpenChange={setOpen}>
				<Dialog.Trigger asChild>
					<button className="px-4 py-2 rounded-xl border border-black/10 hover:bg-black/5 transition-colors text-sm font-medium">
						管理分类
					</button>
				</Dialog.Trigger>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
					<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--popover-bg)] backdrop-blur shadow-xl p-6 z-50">
						<Dialog.Title className="text-lg font-semibold mb-4">管理分类</Dialog.Title>

						{error && (
							<div className="mb-4 p-3 rounded-xl bg-red-100 text-red-600 text-sm">
								{error}
							</div>
						)}

						<div className="space-y-4">
							<div className="rounded-xl border border-black/10 p-4">
								<div className="text-sm font-medium mb-3">
									{editingId ? "编辑分类" : "创建新分类"}
								</div>
								<div className="space-y-3">
									<input
										className="w-full h-10 text-sm rounded-xl border border-black/10 bg-transparent px-3 outline-none"
										placeholder="分类名称"
										value={name}
										onChange={(e) => setName(e.target.value.slice(0, 50))}
										maxLength={50}
										disabled={loading}
									/>
									<div>
										<div className="text-xs opacity-70 mb-2">选择颜色</div>
										<div className="flex flex-wrap gap-2">
											{PRESET_COLORS.map((c) => (
												<button
													key={c}
													className={`w-8 h-8 rounded-full transition-transform ${
														color === c ? "ring-2 ring-offset-2 ring-purple-600 scale-110" : ""
													}`}
													style={{ backgroundColor: c }}
													onClick={() => setColor(c)}
													disabled={loading}
													aria-label={`选择颜色 ${c}`}
												/>
											))}
										</div>
									</div>
									<div className="flex gap-2">
										{editingId ? (
											<>
												<button
													className="flex-1 h-10 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors text-sm"
													onClick={cancelEdit}
													disabled={loading}
												>
													取消
												</button>
												<button
													className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm font-medium"
													onClick={() => handleUpdate(editingId)}
													disabled={!name.trim() || loading}
												>
													{loading ? "保存中..." : "保存"}
												</button>
											</>
										) : (
											<button
												className="w-full px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm font-medium"
												onClick={handleCreate}
												disabled={!name.trim() || loading}
											>
												{loading ? "创建中..." : "创建"}
											</button>
										)}
									</div>
								</div>
							</div>

							<div className="space-y-2">
								<div className="text-sm font-medium">现有分类</div>
								{categories.length === 0 ? (
									<div className="text-sm opacity-70">暂无分类</div>
								) : (
									categories.map((category) => (
										<div
											key={category.id}
											className="flex items-center justify-between p-3 rounded-xl border border-black/10"
										>
											<div className="flex items-center gap-2 min-w-0 flex-1">
												<span
													className="w-3 h-3 rounded-full flex-shrink-0"
													style={{ backgroundColor: category.color }}
												/>
												<span className="text-sm truncate">{category.name}</span>
											</div>
											<div className="flex items-center gap-1 flex-shrink-0">
												<button
													className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
													onClick={() => startEdit(category)}
													disabled={loading}
													aria-label="编辑"
												>
													<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
														<path
															d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
															stroke="currentColor"
															strokeWidth="2"
															strokeLinecap="round"
															strokeLinejoin="round"
														/>
													</svg>
												</button>
												<button
													className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
													onClick={() => setConfirmDelete(category)}
													disabled={loading}
													aria-label="删除"
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
									))
								)}
							</div>
						</div>

						<Dialog.Close asChild>
							<button
								className="absolute top-4 right-4 h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
								aria-label="关闭"
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
									<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
								</svg>
							</button>
						</Dialog.Close>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>

			<ConfirmDialog
				open={confirmDelete !== null}
				onOpenChange={(open) => !open && setConfirmDelete(null)}
				title="确认删除分类"
				description={`确定删除分类「${confirmDelete?.name}」吗？该分类下的习惯将移至"未分类"。`}
				confirmText="删除"
				onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
				loading={loading}
				variant="danger"
			/>
		</>
	);
}
