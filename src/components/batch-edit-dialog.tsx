"use client";

import { HabitCategory, HabitWithCategory } from "@/lib/types";
import { useState, useEffect, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import TagInput from "./tag-input";

interface BatchEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedCount: number;
	selectedHabits: HabitWithCategory[];
	categories: HabitCategory[];
	allTags: string[];
	onConfirm: (updates: {
		category_id?: string | null;
		addTags?: string[];
		removeTags?: string[];
	}) => Promise<void>;
}

export default function BatchEditDialog({
	open,
	onOpenChange,
	selectedCount,
	selectedHabits,
	categories,
	allTags,
	onConfirm,
}: BatchEditDialogProps) {
	// 计算共同的分类
	const commonCategoryId = useMemo(() => {
		if (selectedHabits.length === 0) return "";
		const firstCategoryId = selectedHabits[0].category_id || "none";
		const allSame = selectedHabits.every(h => (h.category_id || "none") === firstCategoryId);
		return allSame ? firstCategoryId : "mixed";
	}, [selectedHabits]);

	const [categoryId, setCategoryId] = useState<string>("");
	const [categoryChanged, setCategoryChanged] = useState(false); // 追踪分类是否被修改
	const [addTags, setAddTags] = useState<string[]>([]);
	const [removeTags, setRemoveTags] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// 当对话框打开时,初始化分类值
	useEffect(() => {
		if (open) {
			setCategoryId(commonCategoryId === "mixed" ? "" : commonCategoryId);
			setCategoryChanged(false); // 重置修改状态
			setAddTags([]);
			setRemoveTags([]);
			setError(null);
		}
	}, [open, commonCategoryId]);

	// 处理分类变化
	const handleCategoryChange = (value: string) => {
		setCategoryId(value);
		setCategoryChanged(true);
	};

	// 清除分类选择
	const handleClearCategory = () => {
		setCategoryId("");
		setCategoryChanged(false);
	};

	const handleConfirm = async () => {
		setLoading(true);
		setError(null);
		try {
			const updates: any = {};
			
			// 只有当用户主动修改了分类时才传递 category_id
			if (categoryChanged) {
				updates.category_id = categoryId === "none" ? null : categoryId;
			}
			
			if (addTags.length > 0) {
				updates.addTags = addTags;
			}
			if (removeTags.length > 0) {
				updates.removeTags = removeTags;
			}

			await onConfirm(updates);
			handleClose();
		} catch (err: any) {
			setError(err.message || "批量编辑失败");
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		onOpenChange(false);
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--popover-bg)] backdrop-blur shadow-xl p-6 z-50">
					<Dialog.Title className="text-lg font-semibold mb-2">批量编辑</Dialog.Title>
					<Dialog.Description className="text-sm opacity-70 mb-4">
						将对 {selectedCount} 个习惯应用以下修改
					</Dialog.Description>

					{error && (
						<div className="mb-4 p-3 rounded-xl bg-red-100 text-red-600 text-sm">
							{error}
						</div>
					)}

					<div className="space-y-4">
						<div>
							<label className="text-sm font-medium mb-2 block">
								分类
								{commonCategoryId === "mixed" && (
									<span className="ml-2 text-xs opacity-60">(当前选中习惯的分类不同)</span>
								)}
							</label>
							<div className="flex gap-2">
								<Select.Root value={categoryId} onValueChange={handleCategoryChange} disabled={loading}>
									<Select.Trigger className="flex-1 h-10 px-3 rounded-xl border border-black/10 bg-transparent text-sm outline-none cursor-pointer inline-flex items-center justify-between disabled:opacity-50">
										<Select.Value placeholder="选择分类..." />
										<Select.Icon>
											<svg width="12" height="12" viewBox="0 0 24 24" fill="none">
												<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
											</svg>
										</Select.Icon>
									</Select.Trigger>
								<Select.Portal>
									<Select.Content className="overflow-hidden rounded-xl border border-[color:var(--border-color)] bg-[color:var(--popover-bg)] backdrop-blur shadow-xl z-50">
										<Select.Viewport className="p-1">
											<Select.Item value="none" className="relative flex items-center h-9 px-8 rounded-lg text-sm outline-none cursor-pointer hover:bg-black/5 data-[highlighted]:bg-black/5">
												<Select.ItemText>未分类</Select.ItemText>
												<Select.ItemIndicator className="absolute left-2 inline-flex items-center">
													<svg width="12" height="12" viewBox="0 0 24 24" fill="none">
														<path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
													</svg>
												</Select.ItemIndicator>
											</Select.Item>
											{categories.map((cat) => (
												<Select.Item key={cat.id} value={cat.id} className="relative flex items-center h-9 px-8 rounded-lg text-sm outline-none cursor-pointer hover:bg-black/5 data-[highlighted]:bg-black/5">
													<Select.ItemText>
														<span className="inline-flex items-center gap-2">
															<span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
															{cat.name}
														</span>
													</Select.ItemText>
													<Select.ItemIndicator className="absolute left-2 inline-flex items-center">
														<svg width="12" height="12" viewBox="0 0 24 24" fill="none">
															<path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
														</svg>
													</Select.ItemIndicator>
												</Select.Item>
											))}
										</Select.Viewport>
									</Select.Content>
								</Select.Portal>
							</Select.Root>
							{categoryChanged && categoryId && (
								<button
									className="h-10 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors text-sm disabled:opacity-50"
									onClick={handleClearCategory}
									disabled={loading}
									title="清除分类选择"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
										<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
									</svg>
								</button>
							)}
							</div>
						</div>

						<div>
							<label className="text-sm font-medium mb-2 block">添加标签（可选）</label>
							<TagInput
								tags={addTags}
								onChange={setAddTags}
								suggestions={allTags}
								disabled={loading}
								placeholder="输入要添加的标签"
							/>
						</div>

						<div>
							<label className="text-sm font-medium mb-2 block">移除标签（可选）</label>
							<TagInput
								tags={removeTags}
								onChange={setRemoveTags}
								suggestions={allTags}
								disabled={loading}
								placeholder="输入要移除的标签"
							/>
						</div>

						<div className="flex gap-2 pt-2">
							<button
								className="flex-1 h-10 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors text-sm"
								onClick={handleClose}
								disabled={loading}
							>
								取消
							</button>
							<button
								className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm font-medium"
								onClick={handleConfirm}
								disabled={loading}
							>
								{loading ? "处理中..." : "确认"}
							</button>
						</div>
					</div>

					<Dialog.Close asChild>
						<button
							className="absolute top-4 right-4 h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors"
							aria-label="关闭"
							disabled={loading}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
								<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
							</svg>
						</button>
					</Dialog.Close>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
