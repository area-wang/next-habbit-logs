"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { HabitWithCategory, HabitCategory, TagStats } from "@/lib/types";
import {
	useHabits,
	useCategories,
	useTags,
	createCategory,
	updateCategory,
	deleteCategory,
	archiveHabit,
	restoreHabit,
	deleteHabit,
	batchOperateHabits,
} from "@/hooks/use-habits";
import { serializeTags } from "@/lib/habit-utils";
import CategoryManager from "@/components/category-manager";
import CategoryFilter from "@/components/category-filter";
import TagFilter from "@/components/tag-filter";
import BatchToolbar from "@/components/batch-toolbar";
import BatchEditDialog from "@/components/batch-edit-dialog";
import ArchiveView from "@/components/archive-view";
import ConfirmDialog from "@/components/confirm-dialog";
import TagInput from "@/components/tag-input";

// 导入原有的组件和函数
import * as Popover from "@radix-ui/react-popover";
import * as Select from "@radix-ui/react-select";
import TimeSelect from "../today/time-select";
import { DayPicker } from "react-day-picker";
import { ReminderTimeInput } from "./reminder-time-input";

// 工具函数
function minToHHMM(v: number) {
	const h = Math.floor(v / 60);
	const m = v % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToMin(s: string) {
	const m = String(s || "").trim().match(/^(\d{2}):(\d{2})$/);
	if (!m) return null;
	const hh = Number(m[1]);
	const mm = Number(m[2]);
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
	if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
	return hh * 60 + mm;
}

function isValidYmd(s: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function dateFromYmd(ymd: string) {
	const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
	return new Date(y, mo - 1, d);
}

function ymdFromDate(d: Date) {
	const y = d.getFullYear();
	const m = d.getMonth() + 1;
	const day = d.getDate();
	return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addMonths(d: Date, delta: number) {
	const y = d.getFullYear();
	const m = d.getMonth();
	return new Date(y, m + delta, 1);
}

// PrettySelect 组件
function PrettySelect({
	value,
	onValueChange,
	options,
	ariaLabel,
}: {
	value: string;
	onValueChange: (v: string) => void;
	options: Array<{ value: string; label: string }>;
	ariaLabel: string;
}) {
	return (
		<Select.Root value={value} onValueChange={onValueChange}>
			<Select.Trigger
				className="h-8 px-3 rounded-full border border-black/10 bg-transparent text-sm font-semibold hover:bg-black/5 transition-colors cursor-pointer inline-flex items-center gap-2"
				aria-label={ariaLabel}
			>
				<Select.Value />
				<Select.Icon className="opacity-70">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
						<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</Select.Icon>
			</Select.Trigger>
			<Select.Portal>
				<Select.Content
					position="popper"
					sideOffset={8}
					className="z-50 overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--popover-bg)] backdrop-blur shadow-xl"
				>
					<Select.Viewport className="p-1 max-h-48 overflow-y-auto">
						{options.map((opt) => (
							<Select.Item
								key={opt.value}
								value={opt.value}
								className="relative px-3 py-2 text-sm rounded-xl cursor-pointer outline-none hover:bg-[color:var(--surface-strong)] data-[state=checked]:bg-[color:var(--rdp-accent-background-color)] data-[state=checked]:font-semibold"
							>
								<Select.ItemText>{opt.label}</Select.ItemText>
							</Select.Item>
						))}
					</Select.Viewport>
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	);
}

// YmdPicker 组件
function YmdPicker({
	value,
	onChange,
	placeholder,
	ariaLabel,
	disabled = false,
	allowClear = true,
}: {
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
	ariaLabel: string;
	disabled?: boolean;
	allowClear?: boolean;
}) {
	const safeValue = useMemo(() => (typeof value === "string" && isValidYmd(value) ? value : ""), [value]);
	const selected = useMemo(() => (safeValue ? dateFromYmd(safeValue) : null), [safeValue]);
	const [viewMonth, setViewMonth] = useState<Date>(() => {
		const d = selected ?? new Date();
		return new Date(d.getFullYear(), d.getMonth(), 1);
	});
	useEffect(() => {
		if (!selected) return;
		setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
	}, [selected?.getFullYear(), selected?.getMonth()]);

	const selectedYear = useMemo(() => String(viewMonth.getFullYear()), [viewMonth]);
	const selectedMonth = useMemo(() => String(viewMonth.getMonth() + 1).padStart(2, "0"), [viewMonth]);
	const yearOptions = useMemo(() => {
		const out: Array<{ value: string; label: string }> = [];
		for (let yy = 1970; yy <= 2100; yy++) out.push({ value: String(yy), label: `${yy}年` });
		return out;
	}, []);
	const monthOptions = useMemo(() => {
		const out: Array<{ value: string; label: string }> = [];
		for (let m = 1; m <= 12; m++) {
			const mm = String(m).padStart(2, "0");
			out.push({ value: mm, label: `${mm}月` });
		}
		return out;
	}, []);

	return (
		<Popover.Root>
			<Popover.Trigger asChild>
				<button
					className="w-full h-10 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors cursor-pointer inline-flex items-center justify-between gap-2 text-sm disabled:opacity-60"
					type="button"
					aria-label={ariaLabel}
					disabled={disabled}
				>
					<span className="inline-flex items-center gap-2 min-w-0">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
							<path
								d="M7 3v2M17 3v2M4 7h16M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						<span className="opacity-80 truncate">{safeValue || placeholder}</span>
					</span>
					<span className="opacity-60">▾</span>
				</button>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					sideOffset={8}
					className="z-50 rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--popover-bg)] backdrop-blur shadow-xl p-3"
				>
					<div className="flex items-center justify-between gap-3">
						<div className="text-xs opacity-70">{ariaLabel}</div>
						{allowClear ? (
							<button
								className="text-xs px-2 py-1 rounded-lg border border-black/10 hover:bg-black/5 transition-colors"
								type="button"
								onClick={() => onChange("")}
								disabled={disabled}
							>
								清除
							</button>
						) : null}
					</div>
					<div className="mt-2 flex items-center justify-between gap-2">
						<button
							className="h-8 w-8 inline-flex items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 transition-colors"
							type="button"
							aria-label="上个月"
							onClick={() => setViewMonth((m) => addMonths(m, -1))}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
								<path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</button>
						<div className="flex items-center gap-2">
							<PrettySelect value={selectedYear} onValueChange={(y) => {
								const yy = Number(y);
								if (!Number.isFinite(yy)) return;
								const mm = Number(selectedMonth) - 1;
								setViewMonth(new Date(yy, mm, 1));
							}} options={yearOptions} ariaLabel="选择年份" />
							<PrettySelect value={selectedMonth} onValueChange={(m) => {
								const mm = Number(m);
								if (!Number.isFinite(mm)) return;
								setViewMonth(new Date(viewMonth.getFullYear(), mm - 1, 1));
							}} options={monthOptions} ariaLabel="选择月份" />
						</div>
						<button
							className="h-8 w-8 inline-flex items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 transition-colors"
							type="button"
							aria-label="下个月"
							onClick={() => setViewMonth((m) => addMonths(m, 1))}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
								<path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</button>
					</div>
					<div className="mt-2">
						<DayPicker
							mode="single"
							selected={selected ?? undefined}
							month={viewMonth}
							onMonthChange={setViewMonth}
							onSelect={(d) => {
								if (!d) return;
								const next = ymdFromDate(d);
								if (!isValidYmd(next)) return;
								onChange(next);
							}}
							weekStartsOn={1}
							className="text-sm"
							styles={{
								caption: { display: "none" },
								nav: { display: "none" },
								day: { borderRadius: 12 },
							}}
						/>
					</div>
					<Popover.Arrow className="fill-[color:var(--popover-bg)]" />
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}

// 主组件
export default function HabitsClientEnhanced() {
	// 视图状态
	const [viewMode, setViewMode] = useState<"active" | "archived">("active");
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [tagMatchMode, setTagMatchMode] = useState<"any" | "all">("any");
	
	// 批量操作状态
	const [batchMode, setBatchMode] = useState(false);
	const [selectedHabitIds, setSelectedHabitIds] = useState<Set<string>>(new Set());
	const [batchEditOpen, setBatchEditOpen] = useState(false);
	
	// 创建习惯状态
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [createCategoryId, setCreateCategoryId] = useState<string>("");
	const [createTags, setCreateTags] = useState<string[]>([]);
	const [createReminders, setCreateReminders] = useState<Array<{ timeMin: number; endTimeMin?: number | null }>>([]);
	const [creating, setCreating] = useState(false);
	const createFormRef = useRef<HTMLDivElement>(null);
	
	// 编辑习惯状态
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [editStartDate, setEditStartDate] = useState("");
	const [editEndDate, setEditEndDate] = useState("");
	const [editCategoryId, setEditCategoryId] = useState<string>("");
	const [editTags, setEditTags] = useState<string[]>([]);
	const [savingId, setSavingId] = useState<string | null>(null);
	const editFormRefs = useRef<Record<string, HTMLDivElement | null>>({});
	
	// 提醒状态
	const [habitReminders, setHabitReminders] = useState<Record<string, Array<{ timeMin: number; endTimeMin?: number | null }>>>({});
	const [remindersLoadingId, setRemindersLoadingId] = useState<string | null>(null);
	const [addRemindHHMM, setAddRemindHHMM] = useState<Record<string, string>>({});
	const [addRemindEndHHMM, setAddRemindEndHHMM] = useState<Record<string, string>>({});
	const [remindersError, setRemindersError] = useState<string | null>(null);
	
	// 确认对话框状态
	const [confirmArchive, setConfirmArchive] = useState<HabitWithCategory | null>(null);
	const [confirmBatchArchive, setConfirmBatchArchive] = useState(false);
	const [confirmBatchRestore, setConfirmBatchRestore] = useState(false);
	const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
	
	// 错误和加载状态
	const [error, setError] = useState<string | null>(null);
	const [operationLoading, setOperationLoading] = useState(false);
	
	// 使用 hooks 获取数据
	const { categories, mutate: mutateCategories } = useCategories();
	const { tags: allTagStats, mutate: mutateTags } = useTags();
	const { habits: activeHabits, mutate: mutateActiveHabits } = useHabits({
		archived: false,
		categoryId: selectedCategory === "uncategorized" ? undefined : selectedCategory || undefined,
		tags: selectedTags.length > 0 ? selectedTags : undefined,
		tagMatch: tagMatchMode,
	});
	const { habits: archivedHabits, mutate: mutateArchivedHabits } = useHabits({ archived: true });
	
	const currentHabits = viewMode === "active" ? activeHabits : archivedHabits;
	
	// 计算分类的习惯数量
	const habitCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		activeHabits.forEach((habit) => {
			if (habit.category_id) {
				counts[habit.category_id] = (counts[habit.category_id] || 0) + 1;
			} else {
				counts["uncategorized"] = (counts["uncategorized"] || 0) + 1;
			}
		});
		return counts;
	}, [activeHabits]);
	
	// 获取所有标签名称
	const allTagNames = useMemo(() => allTagStats.map((t: TagStats) => t.tag), [allTagStats]);

	// 点击外部关闭表单
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Node;
			
			// 检查创建表单
			if (showCreateForm && createFormRef.current && !createFormRef.current.contains(target)) {
				// 检查是否点击了日期选择器或下拉菜单（这些是 Portal 渲染的）
				const isPortalClick = (target as Element).closest('[role="dialog"], [role="listbox"], .rdp');
				if (!isPortalClick) {
					setShowCreateForm(false);
					// 清空表单
					setTitle("");
					setDescription("");
					setStartDate("");
					setEndDate("");
					setCreateCategoryId("");
					setCreateTags([]);
					setCreateReminders([]);
				}
			}
			
			// 检查编辑表单
			if (editingId) {
				const editFormRef = editFormRefs.current[editingId];
				if (editFormRef && !editFormRef.contains(target)) {
					const isPortalClick = (target as Element).closest('[role="dialog"], [role="listbox"], .rdp');
					if (!isPortalClick) {
						setEditingId(null);
					}
				}
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showCreateForm, editingId]);

	// 刷新数据
	const refreshData = () => {
		mutateActiveHabits();
		mutateArchivedHabits();
		mutateCategories();
		mutateTags();
	};
	
	// 创建习惯
	const handleCreate = async () => {
		setError(null);
		setCreating(true);
		try {
			const safeTitle = String(title).trim().slice(0, 50);
			const res = await fetch("/api/habits", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					title: safeTitle,
					description: description || null,
					frequencyType: "daily",
					startDate: startDate.trim() ? startDate.trim() : null,
					endDate: endDate.trim() ? endDate.trim() : null,
					categoryId: createCategoryId || null,
					tags: createTags.length > 0 ? serializeTags(createTags) : null,
					reminders: createReminders.length > 0 ? createReminders : undefined,
				}),
			});
			if (!res.ok) {
				const d = (await res.json().catch(() => null)) as any;
				setError(d?.error || "创建失败");
				return;
			}
			setTitle("");
			setDescription("");
			setStartDate("");
			setEndDate("");
			setCreateCategoryId("");
			setCreateTags([]);
			setCreateReminders([]);
			setShowCreateForm(false); // 创建成功后收起表单
			refreshData();
		} finally {
			setCreating(false);
		}
	};
	
	// 开始编辑
	const beginEdit = (h: HabitWithCategory) => {
		setEditingId(h.id);
		setEditTitle(h.title);
		setEditDescription(h.description ? String(h.description) : "");
		setEditStartDate(h.start_date ? String(h.start_date) : "");
		setEditEndDate(h.end_date ? String(h.end_date) : "");
		setEditCategoryId(h.category_id || "");
		setEditTags(h.parsedTags || []);
		void loadHabitReminders(h.id);
		if (typeof window !== "undefined") {
			setTimeout(() => {
				const el = document.querySelector(`[data-habit-id="${h.id}"]`) as HTMLElement | null;
				if (el) {
					el.scrollIntoView({ behavior: "smooth", block: "center" });
				}
			}, 100);
		}
	};
	
	// 保存编辑
	const saveEdit = async (h: HabitWithCategory) => {
		const title = String(editTitle).trim().slice(0, 50);
		if (!title) return;
		const desc = String(editDescription || "").trim();
		const startDate = String(editStartDate || "").trim();
		const endDate = String(editEndDate || "").trim();
		setEditingId(null);
		setError(null);
		setSavingId(h.id);
		try {
			const res = await fetch(`/api/habits/${h.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					title,
					description: desc ? desc : null,
					startDate,
					endDate: endDate ? endDate : null,
					category_id: editCategoryId || null,
					tags: editTags.length > 0 ? serializeTags(editTags) : null,
				}),
			});
			if (!res.ok) {
				const d = (await res.json().catch(() => null)) as any;
				setError(d?.error || "保存失败");
				return;
			}
			refreshData();
		} finally {
			setSavingId(null);
		}
	};

	// 归档习惯
	const handleArchive = async (habit: HabitWithCategory) => {
		setOperationLoading(true);
		try {
			await archiveHabit(habit.id);
			setConfirmArchive(null);
			refreshData();
		} catch (err: any) {
			setError(err.message || "归档失败");
		} finally {
			setOperationLoading(false);
		}
	};
	
	// 恢复习惯
	const handleRestore = async (habitId: string) => {
		try {
			await restoreHabit(habitId);
			refreshData();
		} catch (err: any) {
			setError(err.message || "恢复失败");
		}
	};
	
	// 删除习惯
	const handleDelete = async (habitId: string) => {
		try {
			await deleteHabit(habitId);
			refreshData();
		} catch (err: any) {
			setError(err.message || "删除失败");
		}
	};
	
	// 批量操作
	const handleBatchArchive = async () => {
		setOperationLoading(true);
		try {
			await batchOperateHabits(Array.from(selectedHabitIds), "archive");
			setConfirmBatchArchive(false);
			setSelectedHabitIds(new Set());
			setBatchMode(false);
			refreshData();
		} catch (err: any) {
			setError(err.message || "批量归档失败");
		} finally {
			setOperationLoading(false);
		}
	};
	
	const handleBatchRestore = async () => {
		setOperationLoading(true);
		try {
			await batchOperateHabits(Array.from(selectedHabitIds), "restore");
			setConfirmBatchRestore(false);
			setSelectedHabitIds(new Set());
			setBatchMode(false);
			refreshData();
		} catch (err: any) {
			setError(err.message || "批量恢复失败");
		} finally {
			setOperationLoading(false);
		}
	};
	
	const handleBatchDelete = async () => {
		setOperationLoading(true);
		try {
			await batchOperateHabits(Array.from(selectedHabitIds), "delete");
			setConfirmBatchDelete(false);
			setSelectedHabitIds(new Set());
			setBatchMode(false);
			refreshData();
		} catch (err: any) {
			setError(err.message || "批量删除失败");
		} finally {
			setOperationLoading(false);
		}
	};
	
	const handleBatchEdit = async (updates: any) => {
		setOperationLoading(true);
		try {
			const data: any = {};
			if (updates.category_id !== undefined) {
				data.category_id = updates.category_id;
			}
			if (updates.addTags && updates.addTags.length > 0) {
				data.addTags = updates.addTags;
			}
			if (updates.removeTags && updates.removeTags.length > 0) {
				data.removeTags = updates.removeTags;
			}
			await batchOperateHabits(Array.from(selectedHabitIds), "update", data);
			setBatchEditOpen(false);
			setSelectedHabitIds(new Set());
			setBatchMode(false);
			refreshData();
		} catch (err: any) {
			setError(err.message || "批量编辑失败");
		} finally {
			setOperationLoading(false);
		}
	};
	
	// 批量选择
	const toggleSelectHabit = (habitId: string) => {
		const newSet = new Set(selectedHabitIds);
		if (newSet.has(habitId)) {
			newSet.delete(habitId);
		} else {
			newSet.add(habitId);
		}
		setSelectedHabitIds(newSet);
	};
	
	const selectAll = () => {
		setSelectedHabitIds(new Set(currentHabits.map((h) => h.id)));
	};
	
	const deselectAll = () => {
		setSelectedHabitIds(new Set());
	};

	// 加载习惯提醒
	async function loadHabitReminders(habitId: string) {
		setRemindersError(null);
		setRemindersLoadingId(habitId);
		try {
			const res = await fetch(`/api/habits/${habitId}/reminders`);
			if (!res.ok) {
				const d = (await res.json().catch(() => null)) as any;
				setRemindersError(d?.error || "加载提醒失败");
				return;
			}
			const data = (await res.json().catch(() => null)) as any;
			const reminders = ((data?.reminders || []) as any[])
				.map((x) => ({
					timeMin: x?.timeMin == null ? null : Number(x.timeMin),
					endTimeMin: x?.endTimeMin == null ? null : Number(x.endTimeMin),
				}))
				.filter((x): x is { timeMin: number; endTimeMin: number | null } => 
					x.timeMin != null && Number.isFinite(x.timeMin) && x.timeMin >= 0 && x.timeMin <= 1439
				);
			setHabitReminders((prev) => ({ ...prev, [habitId]: reminders }));
		} finally {
			setRemindersLoadingId(null);
		}
	}

	async function addHabitReminder(habitId: string) {
		setRemindersError(null);
		const hhmm = String(addRemindHHMM[habitId] || "").trim();
		const timeMin = hhmmToMin(hhmm);
		if (timeMin == null) {
			setRemindersError("请输入有效时间（HH:MM）");
			return;
		}

		const endHhmm = String(addRemindEndHHMM[habitId] || "").trim();
		let endTimeMin: number | null = null;
		if (endHhmm) {
			endTimeMin = hhmmToMin(endHhmm);
			if (endTimeMin == null) {
				setRemindersError("结束时间格式无效");
				return;
			}
			if (endTimeMin <= timeMin) {
				setRemindersError("结束时间必须晚于开始时间");
				return;
			}
		}

		const res = await fetch(`/api/habits/${habitId}/reminders`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ timeMin, endTimeMin }),
		});
		if (!res.ok) {
			const d = (await res.json().catch(() => null)) as any;
			setRemindersError(d?.error || "添加提醒失败");
			return;
		}
		setAddRemindHHMM((prev) => ({ ...prev, [habitId]: "" }));
		setAddRemindEndHHMM((prev) => ({ ...prev, [habitId]: "" }));
		await loadHabitReminders(habitId);
	}

	async function deleteHabitReminder(habitId: string, timeMin: number) {
		setRemindersError(null);
		const res = await fetch(`/api/habits/${habitId}/reminders`, {
			method: "DELETE",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ timeMin }),
		});
		if (!res.ok) {
			const d = (await res.json().catch(() => null)) as any;
			setRemindersError(d?.error || "删除提醒失败");
			return;
		}
		await loadHabitReminders(habitId);
	}

	return (
		<div className="space-y-6">
			{/* 顶部工具栏 */}
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-2">
					<button
						className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
							viewMode === "active"
								? "bg-purple-600 text-white"
								: "border border-black/10 hover:bg-black/5"
						}`}
						onClick={() => {
							setViewMode("active");
							setBatchMode(false);
							setSelectedHabitIds(new Set());
						}}
					>
						活跃习惯 ({activeHabits.length})
					</button>
					<button
						className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
							viewMode === "archived"
								? "bg-purple-600 text-white"
								: "border border-black/10 hover:bg-black/5"
						}`}
						onClick={() => {
							setViewMode("archived");
							setBatchMode(false);
							setSelectedHabitIds(new Set());
						}}
					>
						归档 ({archivedHabits.length})
					</button>
				</div>
				<div className="flex items-center gap-2">
					{viewMode === "active" && !batchMode && (
						<>
							<CategoryManager
								categories={categories}
								onCreateCategory={async (cat) => {
									await createCategory(cat);
									mutateCategories();
								}}
								onUpdateCategory={async (id, updates) => {
									await updateCategory(id, updates);
									mutateCategories();
								}}
								onDeleteCategory={async (id) => {
									await deleteCategory(id);
									mutateCategories();
									refreshData();
								}}
							/>
							<button
								className="px-4 py-2 rounded-xl border border-black/10 hover:bg-black/5 transition-colors text-sm font-medium"
								onClick={() => setBatchMode(true)}
								disabled={currentHabits.length === 0}
							>
								批量管理
							</button>
						</>
					)}
				</div>
			</div>

			{/* 批量操作工具栏 */}
			{batchMode && (
				<BatchToolbar
					selectedCount={selectedHabitIds.size}
					totalCount={currentHabits.length}
					viewMode={viewMode}
					onSelectAll={selectAll}
					onDeselectAll={deselectAll}
					onArchive={() => setConfirmBatchArchive(true)}
					onRestore={() => setConfirmBatchRestore(true)}
					onDelete={() => setConfirmBatchDelete(true)}
					onEdit={() => setBatchEditOpen(true)}
					onCancel={() => {
						setBatchMode(false);
						setSelectedHabitIds(new Set());
					}}
				/>
			)}

			{/* 错误提示 */}
			{error && (
				<div className="p-3 rounded-xl bg-red-100 text-red-600 text-sm">
					{error}
					<button className="ml-2 underline" onClick={() => setError(null)}>
						关闭
					</button>
				</div>
			)}

			{/* 创建新习惯表单 */}
			{viewMode === "active" && !batchMode && (
				<div>
					{!showCreateForm ? (
						<button
							className="w-full px-4 py-3 rounded-2xl border border-dashed border-black/20 hover:border-purple-400 hover:bg-purple-50 transition-colors text-sm font-medium text-purple-600 flex items-center justify-center gap-2"
							onClick={() => setShowCreateForm(true)}
						>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
								<path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
							新增习惯
						</button>
					) : (
						<div ref={createFormRef} className="rounded-2xl border-2 border-purple-400 p-4 bg-purple-50/30">
							<h2 className="font-semibold text-purple-700">创建新习惯</h2>
							<div className="mt-3 grid gap-3">
								<input
									className="w-full h-10 text-sm rounded-xl border border-black/10 bg-transparent px-3 outline-none"
									placeholder="例如：英语 20 分钟"
									value={title}
									onChange={(e) => setTitle(e.target.value.slice(0, 50))}
									maxLength={50}
									disabled={creating}
								/>
								<input
									className="w-full h-10 text-sm rounded-xl border border-black/10 bg-transparent px-3 outline-none"
									placeholder="描述（可选）"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									disabled={creating}
								/>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									<YmdPicker
										value={startDate}
										onChange={setStartDate}
										placeholder="开始日期（默认今天）"
										ariaLabel="开始日期"
										disabled={creating}
										allowClear={true}
									/>
									<YmdPicker
										value={endDate}
										onChange={setEndDate}
										placeholder="结束日期（可选）"
										ariaLabel="结束日期（可选）"
										disabled={creating}
										allowClear={true}
									/>
								</div>
								<div>
									<label className="text-sm font-medium mb-2 block">分类（可选）</label>
									<select
										className="w-full h-10 px-3 rounded-xl border border-black/10 bg-transparent text-sm outline-none cursor-pointer"
										value={createCategoryId}
										onChange={(e) => setCreateCategoryId(e.target.value)}
										disabled={creating}
									>
										<option value="">未分类</option>
										{categories.map((cat: HabitCategory) => (
											<option key={cat.id} value={cat.id}>
												{cat.name}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="text-sm font-medium mb-2 block">标签（可选）</label>
									<TagInput
										tags={createTags}
										onChange={setCreateTags}
										suggestions={allTagNames}
										disabled={creating}
									/>
								</div>
								<div className="rounded-xl border border-black/10 p-3">
									<div className="text-sm font-medium">提醒时间（可选）</div>
									<div className="text-xs opacity-70 mt-1">可设置多个时间点，到点会推送提醒。</div>
									<div className="mt-2">
										<ReminderTimeInput
											reminders={createReminders}
											onChange={setCreateReminders}
											disabled={creating}
										/>
									</div>
								</div>
								<div className="flex gap-2">
									<button
										className="flex-1 h-10 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors text-sm"
										onClick={() => {
											setShowCreateForm(false);
											setTitle("");
											setDescription("");
											setStartDate("");
											setEndDate("");
											setCreateCategoryId("");
											setCreateTags([]);
											setCreateReminders([]);
										}}
										disabled={creating}
									>
										取消
									</button>
									<button
										className="flex-1 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
										onClick={handleCreate}
										disabled={creating || !title.trim()}
									>
										{creating ? "创建中..." : "创建"}
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
			)}

			{/* 筛选器 */}
			{viewMode === "active" && !batchMode && (
				<>
					<CategoryFilter
						categories={categories}
						selectedCategory={selectedCategory}
						onSelectCategory={setSelectedCategory}
						habitCounts={habitCounts}
					/>
					{allTagStats.length > 0 && (
						<TagFilter
							allTags={allTagStats}
							selectedTags={selectedTags}
							onSelectTags={setSelectedTags}
							matchMode={tagMatchMode}
							onMatchModeChange={setTagMatchMode}
						/>
					)}
				</>
			)}

			{/* 习惯列表 */}
			{viewMode === "archived" ? (
				<ArchiveView
					archivedHabits={archivedHabits}
					onRestore={handleRestore}
					onDelete={handleDelete}
					onRefresh={refreshData}
				/>
			) : (
				<div className="space-y-2">
					{currentHabits.length === 0 ? (
						<div className="text-center py-12">
							<div className="text-4xl mb-3">✨</div>
							<div className="text-sm opacity-70">
								{selectedCategory || selectedTags.length > 0
									? "没有找到匹配的习惯"
									: "还没有习惯"}
							</div>
						</div>
					) : (
						currentHabits.map((h) => (
							<div
								key={h.id}
								data-habit-id={h.id}
								className={`rounded-xl border border-black/10 px-4 py-3 transition-colors ${
									batchMode && selectedHabitIds.has(h.id)
										? "bg-purple-50 border-purple-200"
										: ""
								}`}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2 mb-1">
											{batchMode && (
												<input
													type="checkbox"
													className="w-4 h-4 rounded cursor-pointer"
													checked={selectedHabitIds.has(h.id)}
													onChange={() => toggleSelectHabit(h.id)}
												/>
											)}
											{h.category && (
												<span
													className="w-3 h-3 rounded-full flex-shrink-0"
													style={{ backgroundColor: h.category.color }}
													title={h.category.name}
												/>
											)}
											<div className="font-medium break-words whitespace-normal">{h.title}</div>
										</div>
										{h.description && <div className="text-sm opacity-70 mt-1">{h.description}</div>}
										{h.parsedTags && h.parsedTags.length > 0 && (
											<div className="flex flex-wrap gap-1 mt-2">
												{h.parsedTags.map((tag, idx) => (
													<span
														key={idx}
														className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs"
													>
														{tag}
													</span>
												))}
											</div>
										)}
										<div className="text-sm opacity-70 mt-1">
											生效：{h.start_date}
											{h.end_date ? ` ~ ${h.end_date}` : ""}
										</div>
									</div>
									{!batchMode && (
										<div className="flex items-center gap-2 flex-shrink-0 ml-auto">
											<button
												className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 transition-colors cursor-pointer"
												onClick={() => (editingId === h.id ? setEditingId(null) : beginEdit(h))}
												aria-label={editingId === h.id ? "取消编辑" : "编辑"}
												disabled={savingId === h.id}
											>
												<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
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
												className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 transition-colors cursor-pointer"
												onClick={() => setConfirmArchive(h)}
												aria-label="归档"
												disabled={savingId === h.id}
											>
												<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
													<path
														d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
												</svg>
											</button>
										</div>
									)}
								</div>

								{/* 编辑表单 */}
								{editingId === h.id && (
									<div ref={(el) => { if (el) editFormRefs.current[h.id] = el; }} className="mt-3 grid gap-2 p-3 rounded-xl border-2 border-purple-400 bg-purple-50/30">
										<input
											className="w-full h-10 text-sm rounded-xl border border-black/10 bg-transparent px-3 outline-none"
											value={editTitle}
											onChange={(e) => setEditTitle(e.target.value.slice(0, 50))}
											placeholder="标题"
											maxLength={50}
										/>
										<textarea
											className="w-full rounded-xl border border-black/10 bg-transparent px-3 py-2 outline-none"
											value={editDescription}
											onChange={(e) => setEditDescription(e.target.value)}
											placeholder="正文/备注（可选）"
											rows={2}
										/>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
											<YmdPicker
												value={editStartDate}
												onChange={setEditStartDate}
												placeholder="开始日期"
												ariaLabel="开始日期"
												allowClear={false}
											/>
											<YmdPicker
												value={editEndDate}
												onChange={setEditEndDate}
												placeholder="结束日期（可选）"
												ariaLabel="结束日期（可选）"
												allowClear={true}
											/>
										</div>
										<div>
											<label className="text-sm font-medium mb-2 block">分类</label>
											<Select.Root value={editCategoryId || "none"} onValueChange={(val) => setEditCategoryId(val === "none" ? "" : val)}>
												<Select.Trigger className="w-full h-10 px-3 rounded-xl border border-black/10 bg-transparent text-sm outline-none cursor-pointer inline-flex items-center justify-between">
													<Select.Value placeholder="未分类" />
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
															{categories.map((cat: HabitCategory) => (
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
										</div>
										<div>
											<label className="text-sm font-medium mb-2 block">标签</label>
											<TagInput
												tags={editTags}
												onChange={setEditTags}
												suggestions={allTagNames}
											/>
										</div>

										{/* 提醒时间管理 */}
										<div className="mt-2 rounded-xl border border-black/10 p-3">
											<div className="text-sm font-medium">提醒时间</div>
											<div className="text-xs opacity-70 mt-1">可设置多个时间点，到点会推送提醒（关闭页面也可提醒）。</div>
											{remindersError && <div className="text-xs mt-2 text-red-600">{remindersError}</div>}
											<div className="mt-2 flex items-center gap-2">
												<div className="w-32">
													<TimeSelect
														value={addRemindHHMM[h.id] || ""}
														onChange={(v) => setAddRemindHHMM((prev) => ({ ...prev, [h.id]: v }))}
														placeholder="开始时间"
														stepMin={5}
													/>
												</div>
												<div className="w-32">
													<TimeSelect
														value={addRemindEndHHMM[h.id] || ""}
														onChange={(v) => setAddRemindEndHHMM((prev) => ({ ...prev, [h.id]: v }))}
														placeholder="结束时间"
														stepMin={5}
													/>
												</div>
												<button
													className="h-10 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors"
													onClick={() => addHabitReminder(h.id)}
													disabled={remindersLoadingId === h.id}
												>
													添加
												</button>
											</div>

											<div className="mt-3 space-y-2">
												{remindersLoadingId === h.id && <div className="text-xs opacity-70">加载中...</div>}
												{(habitReminders[h.id] || []).length === 0 ? (
													<div className="text-xs opacity-70">暂无提醒时间</div>
												) : (
													<div className="flex flex-wrap gap-2">
														{(habitReminders[h.id] || []).map((r, idx) => (
															<div key={idx} className="inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-1 text-xs">
																<span>
																	{minToHHMM(r.timeMin)}
																	{r.endTimeMin != null && ` - ${minToHHMM(r.endTimeMin)}`}
																</span>
																<button
																	className="opacity-70 hover:opacity-100"
																	onClick={() => deleteHabitReminder(h.id, r.timeMin)}
																	disabled={remindersLoadingId === h.id}
																	aria-label="删除提醒时间"
																>
																	×
																</button>
															</div>
														))}
													</div>
												)}
											</div>
										</div>

										<div className="flex items-center gap-2">
											<button
												className="flex-1 h-10 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors"
												onClick={() => setEditingId(null)}
												disabled={savingId === h.id}
												type="button"
											>
												取消
											</button>
											<button
												className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
												onClick={() => saveEdit(h)}
												disabled={!String(editTitle).trim() || savingId === h.id}
												type="button"
											>
												{savingId === h.id ? "保存中..." : "保存"}
											</button>
										</div>
									</div>
								)}
							</div>
						))
					)}
				</div>
			)}

			{/* 确认对话框 */}
			<ConfirmDialog
				open={confirmArchive !== null}
				onOpenChange={(open) => !open && setConfirmArchive(null)}
				title="确认归档"
				description={`确定归档习惯「${confirmArchive?.title}」吗？归档后可以在归档列表中恢复。`}
				confirmText="归档"
				onConfirm={() => confirmArchive && handleArchive(confirmArchive)}
				loading={operationLoading}
			/>

			<ConfirmDialog
				open={confirmBatchArchive}
				onOpenChange={(open) => !open && setConfirmBatchArchive(false)}
				title="确认批量归档"
				description={`确定归档选中的 ${selectedHabitIds.size} 个习惯吗？归档后可以在归档列表中恢复。`}
				confirmText="批量归档"
				onConfirm={handleBatchArchive}
				loading={operationLoading}
			/>

			<ConfirmDialog
				open={confirmBatchRestore}
				onOpenChange={(open) => !open && setConfirmBatchRestore(false)}
				title="确认批量恢复"
				description={`确定恢复选中的 ${selectedHabitIds.size} 个习惯吗？`}
				confirmText="批量恢复"
				onConfirm={handleBatchRestore}
				loading={operationLoading}
			/>

			<ConfirmDialog
				open={confirmBatchDelete}
				onOpenChange={(open) => !open && setConfirmBatchDelete(false)}
				title="确认批量删除"
				description={`确定永久删除选中的 ${selectedHabitIds.size} 个习惯吗？此操作无法撤销，所有相关数据将被删除。`}
				confirmText="永久删除"
				onConfirm={handleBatchDelete}
				loading={operationLoading}
				variant="danger"
			/>

			{/* 批量编辑对话框 */}
			<BatchEditDialog
				open={batchEditOpen}
				onOpenChange={setBatchEditOpen}
				selectedCount={selectedHabitIds.size}
				selectedHabits={currentHabits.filter(h => selectedHabitIds.has(h.id))}
				categories={categories}
				allTags={allTagNames}
				onConfirm={handleBatchEdit}
			/>
		</div>
	);
}
