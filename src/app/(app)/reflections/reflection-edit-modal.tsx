"use client";

import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import ConfirmDialog from "@/components/confirm-dialog";

interface Tag {
	id: number;
	text: string;
	color: string;
}

interface ReflectionEditModalProps {
	open: boolean;
	onClose: () => void;
	date: string;
	reflectionId?: string;
	onSuccess: () => void;
}

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 8;

const TAG_COLORS = [
	'bg-amber-100 text-amber-800 border-amber-200',
	'bg-orange-100 text-orange-800 border-orange-200',
	'bg-yellow-100 text-yellow-800 border-yellow-200',
	'bg-lime-100 text-lime-800 border-lime-200',
	'bg-green-100 text-green-800 border-green-200',
	'bg-teal-100 text-teal-800 border-teal-200',
	'bg-cyan-100 text-cyan-800 border-cyan-200',
	'bg-sky-100 text-sky-800 border-sky-200',
	'bg-blue-100 text-blue-800 border-blue-200',
	'bg-indigo-100 text-indigo-800 border-indigo-200',
	'bg-purple-100 text-purple-800 border-purple-200',
	'bg-pink-100 text-pink-800 border-pink-200',
	'bg-rose-100 text-rose-800 border-rose-200',
];

export default function ReflectionEditModal({
	open,
	onClose,
	date,
	reflectionId,
	onSuccess,
}: ReflectionEditModalProps) {
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [tags, setTags] = useState<Tag[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [editingTagId, setEditingTagId] = useState<number | null>(null);
	const [initialLoading, setInitialLoading] = useState(true);
	const [confirmRemoveTag, setConfirmRemoveTag] = useState<number | null>(null);
	const titleRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);

	// 加载文章内容
	useEffect(() => {
		if (open) {
			loadContent();
		}
	}, [open, reflectionId]);

	async function loadContent() {
		setInitialLoading(true);
		try {
			if (reflectionId) {
				const res = await fetch(`/api/reflections/${reflectionId}`);
				if (!res.ok) throw new Error("加载失败");

				const data = (await res.json()) as {
					reflection?: {
						id: string;
						title: string | null;
						content: string;
						sideTags?: Array<{id: number; text: string; color?: string}>;
					};
				};

				if (data.reflection) {
					setTitle(data.reflection.title || "");
					setContent(data.reflection.content);
					// 为旧数据添加随机颜色
					const tagsWithColor = (data.reflection.sideTags || []).map(tag => ({
						...tag,
						color: tag.color || TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
					}));
					setTags(tagsWithColor);
				} else {
					setTitle("");
					setContent("");
					setTags([]);
				}
			} else {
				setTitle("");
				setContent("");
				setTags([]);
			}
		} catch (err) {
			console.error(err);
			setTitle("");
			setContent("");
			setTags([]);
		} finally {
			setInitialLoading(false);
		}
	}

	// 同步内容到 contentEditable 元素
	useEffect(() => {
		if (initialLoading) return;

		if (titleRef.current && document.activeElement !== titleRef.current) {
			titleRef.current.innerText = title;
		}
		if (contentRef.current && document.activeElement !== contentRef.current) {
			contentRef.current.innerText = content;
		}
	}, [initialLoading, title, content]);

	function updateContent(newText: string) {
		if (newText.trim() === '') {
			newText = '';
		}
		setContent(newText);
	}

	function handleAddTag() {
		if (tags.length >= MAX_TAGS) {
			setError(`最多只能添加 ${MAX_TAGS} 个标签`);
			setTimeout(() => setError(""), 3000);
			return;
		}

		const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
		const newTag: Tag = {
			id: Date.now(),
			text: "新标签",
			color: randomColor,
		};
		setTags([...tags, newTag]);
		setEditingTagId(newTag.id);
	}

	function handleTagEdit(tagId: number, newText: string) {
		const trimmedText = newText.trim().slice(0, MAX_TAG_LENGTH);
		setTags(tags.map((t) =>
			t.id === tagId ? { ...t, text: trimmedText || "标签" } : t
		));
	}

	function handleRemoveTag(tagId: number) {
		setConfirmRemoveTag(tagId);
	}

	function handleConfirmRemoveTag() {
		if (confirmRemoveTag !== null) {
			setTags(tags.filter((t) => t.id !== confirmRemoveTag));
			setConfirmRemoveTag(null);
		}
	}

	async function handleSave() {
		setError("");
		setLoading(true);

		try {
			const trimmedContent = content.trim();
			if (!trimmedContent) {
				setError("内容不能为空");
				setLoading(false);
				return;
			}

			const res = await fetch(
				reflectionId ? `/api/reflections/${reflectionId}` : "/api/reflections",
				{
					method: reflectionId ? "PATCH" : "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						date,
						title: title.trim() || null,
						content: trimmedContent,
						tags: [],
						sideTags: tags,
					}),
				}
			);

			if (!res.ok) {
				const data = (await res.json()) as { error?: string };
				throw new Error(data.error || "保存失败");
			}

			onSuccess();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "保存失败");
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen && confirmRemoveTag !== null) {
					return;
				}
				if (!isOpen) {
					onClose();
				}
			}}
		>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
				<Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] sm:w-[90vw] md:w-[800px] max-w-4xl max-h-[90vh] bg-[#fefcf3] border-2 border-amber-900/20 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
					{/* 头部 - 始终显示以满足无障碍要求 */}
					<div className="flex-shrink-0 px-6 py-4 border-b border-amber-900/10 bg-[#fff8db]">
						<div className="flex items-center justify-between">
							<Dialog.Title className="text-xl font-semibold text-amber-900">
								{reflectionId ? "编辑札记" : "新增札记"}
							</Dialog.Title>
							<button
								onClick={onClose}
								disabled={loading}
								className="p-2 hover:bg-amber-900/10 rounded-full transition-colors disabled:opacity-50"
								aria-label="关闭"
							>
								<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					</div>

					{initialLoading ? (
						<div className="flex items-center justify-center h-96">
							<div className="text-amber-900/50 text-lg">加载中...</div>
						</div>
					) : (
						<div className="flex flex-col h-full max-h-[calc(90vh-73px)]">
							{/* 标题区 - 固定 */}
							<div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-amber-900/10" style={{ background: '#fefcf3' }}>
								<div
									ref={titleRef}
									contentEditable={!loading}
									suppressContentEditableWarning
									onInput={(e) => {
										const text = e.currentTarget.innerText;
										setTitle(text.trim() === '' ? '' : text);
									}}
									data-placeholder="标题（可选）"
									className="w-full text-2xl md:text-3xl bg-transparent border-none outline-none text-amber-950 font-bold empty:before:content-[attr(data-placeholder)] empty:before:text-amber-900/30"
									style={{ fontFamily: 'var(--font-serif-sc)' }}
								/>
							</div>

							{/* 正文区 - 可滚动 */}
							<div className="flex-1 overflow-y-auto px-6 py-6" style={{ background: 'linear-gradient(to bottom, #fefcf3, #fef9e7)' }}>
								<div
									ref={contentRef}
									contentEditable={!loading}
									suppressContentEditableWarning
									onInput={(e) => {
										const text = e.currentTarget.innerText;
										updateContent(text);
									}}
									onPaste={(e) => {
										e.preventDefault();
										const text = e.clipboardData.getData('text/plain');
										const selection = window.getSelection();
										if (!selection || !contentRef.current) return;

										const range = selection.getRangeAt(0);
										range.deleteContents();
										const textNode = document.createTextNode(text);
										range.insertNode(textNode);

										range.setStartAfter(textNode);
										range.setEndAfter(textNode);
										selection.removeAllRanges();
										selection.addRange(range);

										const newText = contentRef.current.innerText;
										updateContent(newText);
									}}
									data-placeholder="提笔落墨，记录今日思考..."
									className="w-full min-h-[300px] text-base md:text-lg leading-relaxed bg-transparent border-none outline-none text-amber-950 empty:before:content-[attr(data-placeholder)] empty:before:text-amber-900/30"
									style={{
										fontFamily: 'var(--font-serif-sc)',
										textAlign: "justify",
										whiteSpace: "pre-wrap",
										wordBreak: "break-word",
									}}
								/>

								{error && (
									<div className="mt-4 text-sm text-red-700 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
										{error}
									</div>
								)}
							</div>

							{/* 底部操作栏 */}
							<div className="flex-shrink-0 border-t border-amber-900/10 bg-[#fff8db]">
								{/* 标签区域 */}
								<div className="px-6 pt-4 pb-2 space-y-2 border-b border-amber-900/10">
									<div className="flex items-center justify-between">
										<label className="text-sm font-medium text-amber-900">
											标签 ({tags.length}/{MAX_TAGS})
										</label>
										{tags.length < MAX_TAGS && (
											<button
												onClick={handleAddTag}
												className="px-3 py-1 text-sm bg-white/80 hover:bg-amber-900/10 text-amber-900 rounded-full transition-colors border border-amber-900/20"
											>
												+ 添加标签
											</button>
										)}
									</div>

									{tags.length > 0 && (
										<div className="flex flex-wrap gap-2">
											{tags.map((tag) => (
												<div
													key={tag.id}
													className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${tag.color}`}
												>
													<div
														contentEditable={editingTagId === tag.id}
														suppressContentEditableWarning
														onClick={(e) => {
															if (editingTagId !== tag.id) {
																e.stopPropagation();
																setEditingTagId(tag.id);
																setTimeout(() => {
																	const el = e.currentTarget;
																	if (el) {
																		el.focus();
																		const range = document.createRange();
																		range.selectNodeContents(el);
																		const sel = window.getSelection();
																		sel?.removeAllRanges();
																		sel?.addRange(range);
																	}
																}, 10);
															}
														}}
														onBlur={(e) => {
															setEditingTagId(null);
															handleTagEdit(tag.id, e.currentTarget.innerText);
														}}
														onInput={(e) => {
															const text = e.currentTarget.innerText;
															if (text.length > MAX_TAG_LENGTH) {
																e.currentTarget.innerText = text.slice(0, MAX_TAG_LENGTH);
																const range = document.createRange();
																const sel = window.getSelection();
																range.selectNodeContents(e.currentTarget);
																range.collapse(false);
																sel?.removeAllRanges();
																sel?.addRange(range);
															}
														}}
														onKeyDown={(e) => {
															if (e.key === "Enter") {
																e.preventDefault();
																e.currentTarget.blur();
															}
														}}
														className="outline-none text-sm min-w-[60px] cursor-text"
													>
														{tag.text}
													</div>
													<button
														onClick={(e) => {
															e.stopPropagation();
															handleRemoveTag(tag.id);
														}}
														className="w-4 h-4 flex items-center justify-center opacity-50 hover:opacity-100 hover:text-red-600 transition-all"
														title="删除标签"
													>
														×
													</button>
												</div>
											))}
										</div>
									)}
								</div>

								{/* 操作按钮区 */}
								<div className="px-6 py-4">
									<div className="flex items-center justify-between">
										{/* 字数统计 */}
										<div className="text-sm text-amber-900/70">
											{content.length} 字
										</div>

										{/* 操作按钮 */}
										<div className="flex gap-3">
											<button
												onClick={onClose}
												disabled={loading}
												className="px-6 py-2 bg-white/80 hover:bg-amber-900/10 text-amber-900 rounded-full disabled:opacity-50 transition-colors border border-amber-900/20"
											>
												取消
											</button>
											<button
												onClick={handleSave}
												disabled={loading || !content.trim()}
												className="px-6 py-2 bg-amber-700 text-white rounded-full hover:bg-amber-800 disabled:opacity-50 transition-colors shadow-md"
											>
												{loading ? "保存中..." : "保存"}
											</button>
										</div>
									</div>
								</div>
							</div>
t					</div>
						)}
				</Dialog.Content>
			</Dialog.Portal>

			{/* 确认对话框 */}
			<ConfirmDialog
				open={confirmRemoveTag !== null}
				onOpenChange={(open) => !open && setConfirmRemoveTag(null)}
				title="删除标签"
				description="确定要删除该标签吗？"
				confirmText="删除"
				onConfirm={handleConfirmRemoveTag}
				variant="warning"
			/>
		</Dialog.Root>
	);
}

