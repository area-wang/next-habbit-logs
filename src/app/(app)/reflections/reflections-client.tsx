"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import StatsCards from "./stats-cards";
import ReflectionInput from "./reflection-input";
import ReflectionList from "./reflection-list";
import DatePicker from "./date-picker";

interface Reflection {
	id: string;
	title: string | null;
	tags: string[];
	sideTags?: any[];
	content: string;
	createdAt: number;
	updatedAt: number;
}

interface Stats {
	weekCount: number;
	monthCount: number;
	streakDays: number;
}

export default function ReflectionsClient({
	initialDate,
}: {
	initialDate: string;
}) {
	const [reflections, setReflections] = useState<Reflection[]>([]);
	const [stats, setStats] = useState<Stats>({ weekCount: 0, monthCount: 0, streakDays: 0 });
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [todayDate] = useState(initialDate);
	const observerTarget = useRef<HTMLDivElement>(null);

	// 输入框的临时状态
	const [searchInput, setSearchInput] = useState("");
	const [tagsInput, setTagsInput] = useState("");

	// 计算最近一周的日期范围
	const getLastWeekDates = () => {
		const today = new Date(initialDate);
		const weekAgo = new Date(today);
		weekAgo.setDate(weekAgo.getDate() - 7);
		return {
			start: weekAgo.toISOString().split("T")[0],
			end: initialDate
		};
	};

	const lastWeek = getLastWeekDates();
	const [startDateInput, setStartDateInput] = useState(lastWeek.start);
	const [endDateInput, setEndDateInput] = useState(lastWeek.end);

	// 实际用于查询的状态
	const [searchQuery, setSearchQuery] = useState("");
	const [filterTags, setFilterTags] = useState("");
	const [startDate, setStartDate] = useState(lastWeek.start);
	const [endDate, setEndDate] = useState(lastWeek.end);
	const [offset, setOffset] = useState(0);

	const loadData = useCallback(async (isLoadMore = false) => {
		if (isLoadMore) {
			setLoadingMore(true);
		} else {
			setLoading(true);
			setOffset(0);
		}

		try {
			const params = new URLSearchParams();

			if (startDate && endDate) {
				params.append("startDate", startDate);
				params.append("endDate", endDate);
			} else if (startDate) {
				params.append("startDate", startDate);
			} else if (endDate) {
				params.append("endDate", endDate);
			}

			if (searchQuery) params.append("search", searchQuery);
			if (filterTags) params.append("tags", filterTags);

			params.append("limit", "30");
			params.append("offset", String(isLoadMore ? offset : 0));

			const res = await fetch(`/api/reflections?${params}`);
			if (!res.ok) throw new Error("加载失败");

			const data = await res.json() as {
				reflections?: Reflection[];
				stats?: Stats;
				hasMore?: boolean;
			};

			if (isLoadMore) {
				setReflections(prev => [...prev, ...(data.reflections || [])]);
				setOffset(prev => prev + 30);
			} else {
				setReflections(data.reflections || []);
				setOffset(30);
			}

			setHasMore(data.hasMore || false);
			setStats(data.stats || { weekCount: 0, monthCount: 0, streakDays: 0 });
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
			setLoadingMore(false);
		}
	}, [searchQuery, filterTags, startDate, endDate, offset]);

	// 初始加载
	useEffect(() => {
		loadData(false);
	}, [searchQuery, filterTags, startDate, endDate]);

	// 无限滚动
	useEffect(() => {
		const observer = new IntersectionObserver(
			entries => {
				if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
					loadData(true);
				}
			},
			{ threshold: 0.1 }
		);

		if (observerTarget.current) {
			observer.observe(observerTarget.current);
		}

		return () => observer.disconnect();
	}, [hasMore, loading, loadingMore, loadData]);

	// 执行搜索
	const handleSearch = () => {
		setSearchQuery(searchInput);
		setFilterTags(tagsInput);
		setStartDate(startDateInput);
		setEndDate(endDateInput);
	};

	// 清除筛选
	const handleClear = () => {
		const lastWeek = getLastWeekDates();
		setSearchInput("");
		setTagsInput("");
		setStartDateInput(lastWeek.start);
		setEndDateInput(lastWeek.end);
		setSearchQuery("");
		setFilterTags("");
		setStartDate(lastWeek.start);
		setEndDate(lastWeek.end);
	};

	// 重新加载（新建后）
	const handleRefresh = () => {
		setOffset(0);
		loadData(false);
	};

	return (
		<div className="space-y-6">
			{/* 固定头部 */}
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold">札记</h1>
						<div className="text-sm opacity-70 mt-1">记录每日思考，审视内心成长</div>
					</div>
					<ReflectionInput date={todayDate} onSuccess={handleRefresh} />
				</div>

				<StatsCards stats={stats} />

				<div className="space-y-2">
					<div className="flex gap-2 flex-wrap">
						<input
							type="text"
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleSearch()}
							placeholder="搜索标题、内容或标签..."
							className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-[color:var(--border-color)] bg-[color:var(--surface)] rounded-lg placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
						/>
					</div>

					<div className="flex gap-2 items-center flex-wrap">
						<span className="text-xs opacity-70">日期：</span>
						<DatePicker
							date={startDateInput}
							onDateChange={setStartDateInput}
							placeholder="开始"
						/>
						<span className="opacity-70">-</span>
						<DatePicker
							date={endDateInput}
							onDateChange={setEndDateInput}
							placeholder="结束"
						/>
						<button
							onClick={handleSearch}
							className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
						>
							搜索
						</button>
						{(searchInput || startDateInput || endDateInput) && (
							<button
								onClick={handleClear}
								className="px-4 py-2 border border-[color:var(--border-color)] rounded-lg hover:bg-[color:var(--surface-strong)] transition-colors text-sm"
							>
								清除
							</button>
						)}
					</div>
				</div>
			</div>

			{/* 可滚动列表 - 使用flex-1自动填充剩余空间 */}
			<div
				className="overflow-y-auto scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-transparent hover:scrollbar-thumb-purple-500"
				style={{
					height: 'calc(100vh - 436px)',
					scrollbarWidth: 'thin',
					scrollbarColor: 'rgb(192 132 252) transparent'
				}}
			>
				{loading ? (
					<div className="text-center py-8 opacity-70">加载中...</div>
				) : (
					<>
						<div className="flex items-center justify-between mb-3">
							<h3 className="text-xs font-medium opacity-70">
								{(() => {
									const lastWeek = getLastWeekDates();
									const isDefaultRange = startDate === lastWeek.start && endDate === lastWeek.end;
									return isDefaultRange
										? `最近一周 · 共 ${reflections.length} 条记录`
										: `共 ${reflections.length} 条记录`;
								})()}
							</h3>
						</div>
						<ReflectionList reflections={reflections} onUpdate={handleRefresh} />

						{/* 加载更多触发器 */}
						{hasMore && (
							<div ref={observerTarget} className="py-4 text-center">
								{loadingMore ? (
									<span className="text-sm opacity-70">加载中...</span>
								) : (
									<span className="text-sm opacity-50">滚动加载更多</span>
								)}
							</div>
						)}

						{!hasMore && reflections.length > 0 && (
							<div className="py-4 text-center text-xs opacity-50">
								没有更多了
							</div>
						)}
					</>
				)}
			</div>

			<style jsx>{`
				div::-webkit-scrollbar {
					width: 6px;
				}
				div::-webkit-scrollbar-track {
					background: transparent;
				}
				div::-webkit-scrollbar-thumb {
					background: rgb(192 132 252 / 0.6);
					border-radius: 3px;
				}
				div::-webkit-scrollbar-thumb:hover {
					background: rgb(192 132 252);
				}
			`}</style>
		</div>
	);
}
