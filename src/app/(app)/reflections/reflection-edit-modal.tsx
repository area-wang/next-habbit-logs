"use client";

import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import ConfirmDialog from "@/components/confirm-dialog";

interface SideTag {
	id: number;
	text: string;
	side: "left" | "right";
	y: number;
	angle: number;
}

interface ReflectionPage {
	id?: string;
	title: string;
	content: string;
	sideTags: SideTag[];
	pageNumber: number;
}

interface ReflectionEditModalProps {
	open: boolean;
	onClose: () => void;
	date: string;
	reflectionId?: string; // 编辑时传入文章ID
	onSuccess: () => void;
}

const MAX_TAGS = 10; // 最多标注数量
const MAX_TAG_LENGTH = 5; // 标注最大字数

export default function ReflectionEditModal({
	open,
	onClose,
	date,
	reflectionId,
	onSuccess,
}: ReflectionEditModalProps) {
	// 简化状态：只保留必要的
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [sideTags, setSideTags] = useState<SideTag[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [editingTagId, setEditingTagId] = useState<number | null>(null);
	const [initialLoading, setInitialLoading] = useState(true);
	const [confirmRemoveTag, setConfirmRemoveTag] = useState<number | null>(null);
	const [mobileTagsExpanded, setMobileTagsExpanded] = useState(false);
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
				// 编辑模式：直接加载单个反思
				const res = await fetch(`/api/reflections/${reflectionId}`);
				if (!res.ok) throw new Error("加载失败");

				const data = (await res.json()) as {
					reflection?: {
						id: string;
						title: string | null;
						content: string;
						sideTags?: SideTag[];
					};
				};

				if (data.reflection) {
					setTitle(data.reflection.title || "");
					setContent(data.reflection.content);
					setSideTags(data.reflection.sideTags || []);
				} else {
					setTitle("");
					setContent("");
					setSideTags([]);
				}
			} else {
				// 新建模式：创建空白状态
				setTitle("");
				setContent("");
				setSideTags([]);
			}
		} catch (err) {
			console.error(err);
			setTitle("");
			setContent("");
			setSideTags([]);
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
	}, [initialLoading, title, content]); // 只依赖页面索引和加载状态

	// 更新内容
	function updateContent(newText: string) {
		// 清理内容
		if (newText.trim() === '') {
			newText = '';
		}
		setContent(newText);
	}

	// 侧边标签功能
	function handleMakeSideTag(e: React.MouseEvent | React.TouchEvent, side: "left" | "right") {
		// 检查是否已达到最大数量
		if (sideTags.length >= MAX_TAGS) {
			setError(`最多只能添加 ${MAX_TAGS} 个批注`);
			setTimeout(() => setError(""), 3000);
			return;
		}
		
		const rect = e.currentTarget.getBoundingClientRect();
		let y: number;
		
		if ('touches' in e) {
			y = e.touches[0].clientY - rect.top;
		} else {
			y = e.clientY - rect.top;
		}

		const minY = 80;
		const maxY = rect.height - 80;
		
		if (y < minY) y = minY;
		if (y > maxY) y = maxY;

		const sameSideTags = sideTags.filter((t) => t.side === side);

		let conflict = true;
		let attempts = 0;
		const minSpacing = 70;
		
		while (conflict && attempts < 20) {
			conflict = sameSideTags.some((t) => Math.abs(t.y - y) < minSpacing);
			if (conflict) {
				y += 35;
				if (y > maxY) {
					y = minY + (attempts * 25);
					if (y > maxY) {
						setError("批注位置已满，请删除一些批注后再试");
						setTimeout(() => setError(""), 3000);
						return;
					}
				}
			}
			attempts++;
		}
		
		if (y < minY) y = minY;
		if (y > maxY) y = maxY;

		const newTag: SideTag = {
			id: Date.now(),
			text: "新批注",
			side,
			y,
			angle: Number((Math.random() * 6 - 3).toFixed(1)),
		};

		setSideTags([...sideTags, newTag]);
	}

	function handleSideTagEdit(tagId: number, newText: string) {
		const trimmedText = newText.trim().slice(0, MAX_TAG_LENGTH);
		setSideTags(sideTags.map((t) =>
			t.id === tagId ? { ...t, text: trimmedText || "批注" } : t
		));
	}

	function handleRemoveSideTag(tagId: number) {
		setConfirmRemoveTag(tagId);
	}

	function confirmRemoveSideTag() {
		if (confirmRemoveTag !== null) {
			setSideTags(sideTags.filter((t) => t.id !== confirmRemoveTag));
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

			// 直接保存完整内容，不分页
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
						sideTags: sideTags,
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
				// 如果有确认对话框打开，不允许关闭主弹窗
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
				<Dialog.Content 
					className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] sm:w-[90vw] max-w-4xl max-h-[95vh] overflow-y-auto animate-in fade-in zoom-in-95"
				>
					{/* 卷轴容器 */}
					<div className="relative w-full min-h-[650px] h-[85vh] flex items-center justify-center">
						{/* 卷轴背景 */}
						<div
							className="absolute inset-0 bg-cover bg-center bg-no-repeat"
							style={{
								backgroundImage: "url('/scroll-bg2.png')",
								backgroundSize: "contain",
								backgroundPosition: "center",
							}}
						/>

						{/* 左侧感应区（仅桌面端双击） */}
						<div
							className="absolute left-[10%] sm:left-[15%] top-[15%] bottom-[15%] w-[60px] sm:w-[100px] z-30 cursor-crosshair hidden sm:block"
							onDoubleClick={(e) => handleMakeSideTag(e, "left")}
							title="双击此处挂笺"
						/>

						{/* 右侧感应区（仅桌面端双击） */}
						<div
							className="absolute right-[10%] sm:right-[15%] top-[15%] bottom-[15%] w-[60px] sm:w-[100px] z-30 cursor-crosshair hidden sm:block"
							onDoubleClick={(e) => handleMakeSideTag(e, "right")}
							title="双击此处挂笺"
						/>

						{/* 移动端批注按钮 - 顶部中间 */}
						<button
							onClick={() => {
								// 如果已有标签，切换展开/收起状态
								if (sideTags.length > 0) {
									setMobileTagsExpanded(!mobileTagsExpanded);
									return;
								}
								
								// 检查是否已达到最大数量
								if (sideTags.length >= MAX_TAGS) {
									setError(`最多只能添加 ${MAX_TAGS} 个批注`);
									setTimeout(() => setError(""), 3000);
									return;
								}
								
								const newTag: SideTag = {
									id: Date.now(),
									text: "新批注",
									side: "left",
									y: 0,
									angle: 0,
								};
								setSideTags([...sideTags, newTag]);
								setMobileTagsExpanded(true);
							}}
							disabled={sideTags.length >= MAX_TAGS && !mobileTagsExpanded}
							className="absolute left-1/2 -translate-x-1/2 top-[12%] z-30 px-3 py-1 bg-amber-900/80 text-amber-50 rounded-full text-xs hover:bg-amber-900 transition-colors shadow-lg sm:hidden disabled:opacity-50 disabled:cursor-not-allowed"
							style={{ fontFamily: 'var(--font-serif-sc)' }}
						>
							{sideTags.length > 0 
								? `${mobileTagsExpanded ? '收起' : '展开'}批注 (${sideTags.length}/${MAX_TAGS})`
								: `+ 添加批注 (0/${MAX_TAGS})`
							}
						</button>

						{/* 侧边标签层 - 桌面端 */}
						<div className="absolute inset-0 pointer-events-none overflow-hidden hidden sm:block">
							{sideTags
								.sort((a, b) => a.y - b.y)
								.map((tag, index) => {
								// 确保标签位置在合理范围内
								const clampedY = Math.max(80, Math.min(tag.y, window.innerHeight * 0.65));
								
								return (
								<div
									key={tag.id}
									className={`absolute flex items-center pointer-events-none ${
										tag.side === "left" ? "left-[5%] sm:left-[8%]" : "right-[5%] sm:right-[8%]"
									}`}
									style={{
										top: `${clampedY}px`,
										transform: `rotate(${tag.angle}deg)`,
										zIndex: 100 + index, // 基于位置的 z-index，下面的标签层级更高
									}}
								>
									{tag.side === "left" ? (
										<>
											<div
												className="relative w-[90px] sm:w-[110px] min-h-[35px] sm:min-h-[40px] bg-[#d4b689] pointer-events-auto px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-center text-center cursor-pointer shadow-lg group"
												style={{
													clipPath:
														"polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%)",
													fontFamily: 'var(--font-serif-sc)',
													fontSize: "0.8rem",
													fontWeight: 500,
													backgroundImage:
														"url('https://www.transparenttextures.com/patterns/felt.png')",
												}}
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
																el.focus();
																const range = document.createRange();
																range.selectNodeContents(el);
																const sel = window.getSelection();
																sel?.removeAllRanges();
																sel?.addRange(range);
															}, 0);
														}
													}}
													onBlur={(e) => {
														setEditingTagId(null);
														handleSideTagEdit(tag.id, e.currentTarget.innerText);
													}}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															e.preventDefault();
															e.currentTarget.blur();
														}
													}}
													className="flex-1 outline-none text-xs sm:text-sm"
												>
													{tag.text}
												</div>
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleRemoveSideTag(tag.id);
													}}
													className="absolute -top-1 -left-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-600 text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-xs hover:bg-red-700"
													title="删除批注"
												>
													×
												</button>
												<div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#1a120c] rounded-full" />
											</div>
											<div className="h-[1px] w-[35px] sm:w-[45px] bg-[#5d3a1a] opacity-60 shadow-sm" />
										</>
									) : (
										<>
											<div className="h-[1px] w-[35px] sm:w-[45px] bg-[#5d3a1a] opacity-60 shadow-sm" />
											<div
												className="relative w-[90px] sm:w-[110px] min-h-[35px] sm:min-h-[40px] bg-[#d4b689] pointer-events-auto px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-center text-center cursor-pointer shadow-lg group"
												style={{
													clipPath:
														"polygon(10% 0%, 100% 0%, 100% 100%, 10% 100%, 0% 50%)",
													fontFamily: 'var(--font-serif-sc)',
													fontSize: "0.8rem",
													fontWeight: 500,
													backgroundImage:
														"url('https://www.transparenttextures.com/patterns/felt.png')",
												}}
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
																el.focus();
																const range = document.createRange();
																range.selectNodeContents(el);
																const sel = window.getSelection();
																sel?.removeAllRanges();
																sel?.addRange(range);
															}, 0);
														}
													}}
													onBlur={(e) => {
														setEditingTagId(null);
														handleSideTagEdit(tag.id, e.currentTarget.innerText);
													}}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															e.preventDefault();
															e.currentTarget.blur();
														}
													}}
													className="flex-1 outline-none text-xs sm:text-sm"
												>
													{tag.text}
												</div>
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleRemoveSideTag(tag.id);
													}}
													className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-600 text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-xs hover:bg-red-700"
													title="删除批注"
												>
													×
												</button>
												<div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#1a120c] rounded-full" />
											</div>
										</>
									)}
								</div>
								);
							})}
						</div>

						{/* 移动端标签层 - 可折叠的顶部 tag 样式 */}
						{mobileTagsExpanded && sideTags.length > 0 && (
							<div className="absolute top-[16%] left-1/2 -translate-x-1/2 w-[80%] z-30 sm:hidden">
								<div className="bg-amber-50/95 backdrop-blur-sm rounded-2xl p-3 shadow-xl border border-amber-900/20">
									<div className="flex flex-wrap gap-2 justify-center mb-2">
										{sideTags.map((tag) => (
											<div
												key={tag.id}
												className="relative bg-amber-900/80 text-amber-50 px-3 py-1 rounded-full text-xs flex items-center gap-2 shadow-md"
												style={{ fontFamily: 'var(--font-serif-sc)' }}
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
																el.focus();
																const range = document.createRange();
																range.selectNodeContents(el);
																const sel = window.getSelection();
																sel?.removeAllRanges();
																sel?.addRange(range);
															}, 0);
														}
													}}
													onBlur={(e) => {
														setEditingTagId(null);
														handleSideTagEdit(tag.id, e.currentTarget.innerText);
													}}
													onInput={(e) => {
														// 实时限制字数
														const text = e.currentTarget.innerText;
														if (text.length > MAX_TAG_LENGTH) {
															e.currentTarget.innerText = text.slice(0, MAX_TAG_LENGTH);
															// 将光标移到末尾
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
													className="outline-none min-w-[40px] max-w-[80px]"
												>
													{tag.text}
												</div>
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleRemoveSideTag(tag.id);
													}}
													className="w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 flex-shrink-0"
												>
													×
												</button>
											</div>
										))}
									</div>
									{sideTags.length < MAX_TAGS && (
										<button
											onClick={(e) => {
												e.stopPropagation();
												const newTag: SideTag = {
													id: Date.now(),
													text: "新批注",
													side: "left",
													y: 0,
													angle: 0,
												};
												setSideTags([...sideTags, newTag]);
											}}
											className="w-full py-1 bg-amber-900/60 text-amber-50 rounded-full text-xs hover:bg-amber-900/80 transition-colors"
											style={{ fontFamily: 'var(--font-serif-sc)' }}
										>
											+ 添加
										</button>
									)}
								</div>
							</div>
						)}

						{/* 内容区域 */}
						<div className="relative z-10 w-[70%] sm:w-[60%] max-h-[55%] sm:max-h-[60%] px-4 sm:px-6 py-6 sm:py-8 flex flex-col">
							{initialLoading ? (
								<div className="flex items-center justify-center h-full">
									<div className="text-amber-900/50">加载中...</div>
								</div>
							) : (
								<>
									{/* 标题 - 固定不滚动 */}
									<div
										ref={titleRef}
										contentEditable={!loading}
										suppressContentEditableWarning
										onInput={(e) => {
											const text = e.currentTarget.innerText;
											setTitle(text.trim() === '' ? '' : text);
										}}
										data-placeholder="题记（可选）"
										className="w-full text-center text-xl sm:text-2xl md:text-3xl bg-transparent border-none outline-none text-amber-950 mb-3 sm:mb-4 md:mb-6 font-bold pb-2 sm:pb-3 md:pb-4 border-b border-amber-900/20 empty:before:content-[attr(data-placeholder)] empty:before:text-amber-900/30 px-4 sm:px-6 md:px-8 flex-shrink-0"
										style={{ fontFamily: 'var(--font-serif-sc)' }}
									/>

									{/* 正文容器 - 可滚动 */}
									<div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
										<style jsx>{`
											div::-webkit-scrollbar {
												display: none;
											}
										`}</style>
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
											data-placeholder="提笔落墨，纸短情长..."
											className="w-full min-h-[220px] sm:min-h-[280px] text-sm sm:text-base md:text-lg leading-relaxed sm:leading-loose bg-transparent border-none outline-none text-amber-950 empty:before:content-[attr(data-placeholder)] empty:before:text-amber-900/30 px-4 sm:px-6 md:px-8"
											style={{
												fontFamily: 'var(--font-serif-sc)',
												textAlign: "justify",
												whiteSpace: "pre-wrap",
												wordBreak: "break-word",
											}}
										/>
									</div>

									{error && (
										<div className="mt-3 sm:mt-4 text-xs sm:text-sm text-red-700 bg-red-50/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex-shrink-0">
											{error}
										</div>
									)}
								</>
							)}
						</div>

						{/* 字数统计 - 固定在内容区域下方中间 */}
						<div className="absolute bottom-[90px] sm:bottom-[110px] left-1/2 -translate-x-1/2 z-20 text-xs sm:text-sm text-amber-900/70 bg-amber-50/80 px-3 py-1 rounded-full shadow-sm">
							{content.length} 字
						</div>

						{/* 操作按钮 */}
						<div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-4 z-20">
							<button
								onClick={onClose}
								disabled={loading}
								className="px-4 py-1.5 sm:px-6 sm:py-2 bg-amber-900/80 text-amber-50 rounded-full hover:bg-amber-900 disabled:opacity-50 transition-colors shadow-lg text-sm sm:text-base"
								style={{ fontFamily: 'var(--font-serif-sc)', fontWeight: 500 }}
							>
								取消
							</button>
							<button
								onClick={handleSave}
								disabled={loading || !content.trim()}
								className="px-4 py-1.5 sm:px-6 sm:py-2 bg-amber-700 text-white rounded-full hover:bg-amber-800 disabled:opacity-50 transition-colors shadow-lg text-sm sm:text-base"
								style={{ fontFamily: 'var(--font-serif-sc)', fontWeight: 500 }}
							>
								{loading ? "墨迹入纸..." : "存入卷轴"}
							</button>
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Portal>

			{/* 确认对话框 */}
			<ConfirmDialog
				open={confirmRemoveTag !== null}
				onOpenChange={(open) => !open && setConfirmRemoveTag(null)}
				title="撕掉批注"
				description="确定要撕掉该批注吗？"
				confirmText="撕掉"
				onConfirm={confirmRemoveSideTag}
				variant="warning"
			/>
		</Dialog.Root>
	);
}
