"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { HabitActionLog } from "@/lib/types";
import ImageUploader from "./image-uploader";
import ImageGridPreview from "./image-grid-preview";

interface ActionLogsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	habitId: string;
	habitTitle: string;
}

const MOOD_OPTIONS = [
	{ value: 1, label: "困难", emoji: "😓", color: "text-red-600" },
	{ value: 2, label: "一般", emoji: "😐", color: "text-yellow-600" },
	{ value: 3, label: "顺利", emoji: "😊", color: "text-green-600" },
];

export default function ActionLogsDialog({ open, onOpenChange, habitId, habitTitle }: ActionLogsDialogProps) {
	const [actionLogs, setActionLogs] = useState<HabitActionLog[]>([]);
	const [loading, setLoading] = useState(false);
	const [showAddForm, setShowAddForm] = useState(false);
	const [newContent, setNewContent] = useState("");
	const [newImages, setNewImages] = useState<string[]>([]);
	const [newMood, setNewMood] = useState<number | null>(null);
	const [newIsMilestone, setNewIsMilestone] = useState(false);
	const [newLinkedDate, setNewLinkedDate] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [editingLogId, setEditingLogId] = useState<string | null>(null);
	const [editContent, setEditContent] = useState("");
	const [editImages, setEditImages] = useState<string[]>([]);
	const [editMood, setEditMood] = useState<number | null>(null);
	const [editIsMilestone, setEditIsMilestone] = useState(false);
	const [editLinkedDate, setEditLinkedDate] = useState("");

	useEffect(() => {
		if (open && habitId) {
			loadActionLogs();
		}
	}, [open, habitId]);

	async function loadActionLogs() {
		setLoading(true);
		try {
			const res = await fetch(`/api/habits/${habitId}/action-logs`);
			if (res.ok) {
				const data = await res.json() as any;
				setActionLogs(data.actionLogs || []);
			}
		} catch (err) {
			console.error("Failed to load action logs:", err);
		} finally {
			setLoading(false);
		}
	}

	async function handleAdd() {
		if (!newContent.trim()) {
			setError("请输入行动内容");
			return;
		}

		setSaving(true);
		setError(null);
		try {
			const res = await fetch(`/api/habits/${habitId}/action-logs`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					content: newContent.trim(),
					images: newImages,
					mood: newMood,
					isMilestone: newIsMilestone,
					linkedDate: newLinkedDate || null,
				}),
			});

			if (!res.ok) {
				const data = await res.json() as any;
				setError(data.error || "添加失败");
				return;
			}

			setNewContent("");
			setNewImages([]);
			setNewMood(null);
			setNewIsMilestone(false);
			setNewLinkedDate("");
			setShowAddForm(false);
			await loadActionLogs();
		} catch (err) {
			setError("添加失败");
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete(logId: string) {
		if (!confirm("确定删除这条行动记录吗？")) return;

		try {
			const res = await fetch(`/api/habits/${habitId}/action-logs?logId=${logId}`, {
				method: "DELETE",
			});
			if (res.ok) {
				await loadActionLogs();
			}
		} catch (err) {
			console.error("Failed to delete action log:", err);
		}
	}

	function beginEdit(log: HabitActionLog) {
		setEditingLogId(log.id);
		setEditContent(log.content);
		setEditMood(log.mood);
		setEditIsMilestone(log.is_milestone === 1);
		setEditLinkedDate(log.linked_date || "");

		// 解析图片
		try {
			if (log.image_url) {
				const images = JSON.parse(log.image_url);
				setEditImages(Array.isArray(images) ? images : []);
			} else {
				setEditImages([]);
			}
		} catch {
			setEditImages([]);
		}
	}

	async function saveEdit(logId: string) {
		if (!editContent.trim()) {
			setError("请输入行动内容");
			return;
		}

		setSaving(true);
		setError(null);
		try {
			const res = await fetch(`/api/habits/${habitId}/action-logs?logId=${logId}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					content: editContent.trim(),
					images: editImages,
					mood: editMood,
					isMilestone: editIsMilestone,
					linkedDate: editLinkedDate || null,
				}),
			});

			if (!res.ok) {
				const data = await res.json() as any;
				setError(data.error || "更新失败");
				return;
			}

			setEditingLogId(null);
			setEditContent("");
			setEditImages([]);
			setEditMood(null);
			setEditIsMilestone(false);
			setEditLinkedDate("");
			await loadActionLogs();
		} catch (err) {
			setError("更新失败");
		} finally {
			setSaving(false);
		}
	}

	function cancelEdit() {
		setEditingLogId(null);
		setEditContent("");
		setEditImages([]);
		setEditMood(null);
		setEditIsMilestone(false);
		setEditLinkedDate("");
		setError(null);
	}

	function formatDate(timestamp: number) {
		const date = new Date(timestamp);
		const now = new Date();
		const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return "今天 " + date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
		if (diffDays === 1) return "昨天 " + date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
		if (diffDays < 7) return `${diffDays}天前`;
		return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
	}

	return (
		<>
			<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
				<Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-2xl max-h-[85vh] rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--background)] shadow-xl overflow-hidden z-50 flex flex-col">
					<div className="p-4 border-b border-[color:var(--border-color)] flex items-center justify-between">
						<div>
							<Dialog.Title className="font-semibold text-lg">行动记录</Dialog.Title>
							<div className="text-sm opacity-70 mt-0.5">{habitTitle}</div>
						</div>
						<Dialog.Close asChild>
							<button className="h-8 w-8 rounded-lg hover:bg-black/5 flex items-center justify-center" aria-label="关闭">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
									<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
								</svg>
							</button>
						</Dialog.Close>
					</div>

					<div className="flex-1 overflow-y-auto p-4">
						{!showAddForm ? (
							<button
								className="w-full px-4 py-3 rounded-xl border border-dashed border-black/20 hover:border-purple-400 hover:bg-purple-50 transition-colors text-sm font-medium text-purple-600 flex items-center justify-center gap-2 mb-4"
								onClick={() => setShowAddForm(true)}
							>
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
									<path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
								记录新行动
							</button>
						) : (
							<div className="rounded-xl border-2 border-purple-400 bg-purple-50/30 p-4 mb-4">
								<div className="font-semibold text-purple-700 mb-3">记录新行动</div>
								<div className="space-y-3">
									<textarea
										className="w-full rounded-xl border border-black/10 bg-transparent px-3 py-2 outline-none text-sm resize-none"
										placeholder="描述你做了什么、遇到了什么挑战、有什么收获..."
										value={newContent}
										onChange={(e) => setNewContent(e.target.value)}
										rows={3}
										maxLength={500}
										disabled={saving}
									/>
									<ImageUploader
										images={newImages}
										onChange={setNewImages}
										disabled={saving}
									/>
									<div className="flex items-center gap-2">
										<label className="text-xs font-medium opacity-70">心情：</label>
										<div className="flex gap-2">
											{MOOD_OPTIONS.map((mood) => (
												<button
													key={mood.value}
													type="button"
													className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
														newMood === mood.value
															? "border-purple-400 bg-purple-100"
															: "border-black/10 hover:bg-black/5"
													}`}
													onClick={() => setNewMood(newMood === mood.value ? null : mood.value)}
													disabled={saving}
												>
													<span className="mr-1">{mood.emoji}</span>
													{mood.label}
												</button>
											))}
										</div>
									</div>
									<div className="flex items-center gap-2">
										<label className="flex items-center gap-2 cursor-pointer">
											<input
												type="checkbox"
												checked={newIsMilestone}
												onChange={(e) => setNewIsMilestone(e.target.checked)}
												disabled={saving}
												className="rounded"
											/>
											<span className="text-sm">标记为里程碑 🎯</span>
										</label>
									</div>
									<div>
										<label className="text-xs font-medium opacity-70 block mb-1">关联日期（可选）</label>
										<input
											type="date"
											className="w-full h-10 rounded-xl border border-black/10 bg-transparent px-3 outline-none text-sm"
											value={newLinkedDate}
											onChange={(e) => setNewLinkedDate(e.target.value)}
											disabled={saving}
										/>
									</div>
									{error && <div className="text-sm text-red-600">{error}</div>}
									<div className="flex gap-2">
										<button
											className="flex-1 h-10 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors text-sm"
											onClick={() => {
												setShowAddForm(false);
												setNewContent("");
												setNewMood(null);
												setNewIsMilestone(false);
												setNewLinkedDate("");
												setError(null);
											}}
											disabled={saving}
										>
											取消
										</button>
										<button
											className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 font-medium"
											onClick={handleAdd}
											disabled={saving || !newContent.trim()}
										>
											{saving ? "保存中..." : "保存"}
										</button>
									</div>
								</div>
							</div>
						)}

						{loading ? (
							<div className="text-center py-8 text-sm opacity-70">加载中...</div>
						) : actionLogs.length === 0 ? (
							<div className="text-center py-8">
								<div className="text-4xl mb-2">📝</div>
								<div className="text-sm opacity-70">还没有行动记录</div>
								<div className="text-xs opacity-60 mt-1">记录你的进展、挑战和收获</div>
							</div>
						) : (
							<div className="space-y-3">
								{actionLogs.map((log) => {
									const moodOption = MOOD_OPTIONS.find((m) => m.value === log.mood);
									const isEditing = editingLogId === log.id;

									return (
										<div
											key={log.id}
											className={`rounded-xl border p-3 ${
												log.is_milestone === 1
													? "border-amber-400 bg-amber-50/30"
													: "border-black/10"
											}`}
										>
											{isEditing ? (
												<div className="space-y-3">
													<textarea
														className="w-full rounded-xl border border-black/10 bg-transparent px-3 py-2 outline-none text-sm resize-none"
														placeholder="描述你做了什么、遇到了什么挑战、有什么收获..."
														value={editContent}
														onChange={(e) => setEditContent(e.target.value)}
														rows={3}
														maxLength={500}
														disabled={saving}
													/>
													<ImageUploader
														images={editImages}
														onChange={setEditImages}
														disabled={saving}
													/>
													<div className="flex items-center gap-2">
														<label className="text-xs font-medium opacity-70">心情：</label>
														<div className="flex gap-2">
															{MOOD_OPTIONS.map((mood) => (
																<button
																	key={mood.value}
																	type="button"
																	className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
																		editMood === mood.value
																			? "border-purple-400 bg-purple-100"
																			: "border-black/10 hover:bg-black/5"
																	}`}
																	onClick={() => setEditMood(editMood === mood.value ? null : mood.value)}
																	disabled={saving}
																>
																	<span className="mr-1">{mood.emoji}</span>
																	{mood.label}
																</button>
															))}
														</div>
													</div>
													<div className="flex items-center gap-2">
														<label className="flex items-center gap-2 cursor-pointer">
															<input
																type="checkbox"
																checked={editIsMilestone}
																onChange={(e) => setEditIsMilestone(e.target.checked)}
																disabled={saving}
																className="rounded"
															/>
															<span className="text-sm">标记为里程碑 🎯</span>
														</label>
													</div>
													<div>
														<label className="text-xs font-medium opacity-70 block mb-1">关联日期（可选）</label>
														<input
															type="date"
															className="w-full h-10 rounded-xl border border-black/10 bg-transparent px-3 outline-none text-sm"
															value={editLinkedDate}
															onChange={(e) => setEditLinkedDate(e.target.value)}
															disabled={saving}
														/>
													</div>
													{error && <div className="text-sm text-red-600">{error}</div>}
													<div className="flex gap-2">
														<button
															className="flex-1 h-10 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors text-sm"
															onClick={cancelEdit}
															disabled={saving}
														>
															取消
														</button>
														<button
															className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 font-medium"
															onClick={() => saveEdit(log.id)}
															disabled={saving || !editContent.trim()}
														>
															{saving ? "保存中..." : "保存"}
														</button>
													</div>
												</div>
											) : (
												<div className="flex items-start justify-between gap-2">
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-2 mb-1">
															<span className="text-xs opacity-60">
																{formatDate(log.created_at)}
															</span>
															{log.is_milestone === 1 && (
																<span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
																	🎯 里程碑
																</span>
															)}
															{log.linked_date && (
																<span className="text-xs opacity-60">
																	📅 {log.linked_date}
																</span>
															)}
														</div>
														<div className="text-sm whitespace-pre-wrap break-words">
															{log.content}
														</div>
														{log.image_url && (() => {
															try {
																const images = JSON.parse(log.image_url);
																if (Array.isArray(images) && images.length > 0) {
																	return <ImageGridPreview images={images} className="mt-2" />;
																}
															} catch {}
															return null;
														})()}
														{moodOption && (
															<div className={`text-xs mt-1 ${moodOption.color}`}>
																{moodOption.emoji} {moodOption.label}
															</div>
														)}
													</div>
													<div className="flex gap-1 flex-shrink-0">
														<button
															className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition-colors"
															onClick={() => beginEdit(log)}
															aria-label="编辑"
														>
															<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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
															className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors"
															onClick={() => handleDelete(log.id)}
															aria-label="删除"
														>
															<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
																<path
																	d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"
																	stroke="currentColor"
																	strokeWidth="2"
																	strokeLinecap="round"
																/>
															</svg>
														</button>
													</div>
												</div>
											)}
										</div>
									);
								})}
							</div>
						)}
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	</>
);
}