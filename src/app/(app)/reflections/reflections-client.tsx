"use client";

import { useEffect, useState, useCallback } from "react";
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
	const [todayDate] = useState(initialDate);
	
	// 输入框的临时状态
	const [searchInput, setSearchInput] = useState("");
	const [tagsInput, setTagsInput] = useState("");
	const [startDateInput, setStartDateInput] = useState("");
	const [endDateInput, setEndDateInput] = useState("");
	
	// 实际用于查询的状态
	const [searchQuery, setSearchQuery] = useState("");
	const [filterTags, setFilterTags] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");

	const loadData = useCallback(async () => {
		setLoading(true);
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

			const res = await fetch(`/api/reflections?${params}`);
			if (!res.ok) throw new Error("加载失败");

			const data = await res.json() as {
				reflections?: Reflection[];
				stats?: Stats;
			};
			setReflections(data.reflections || []);
			setStats(data.stats || { weekCount: 0, monthCount: 0, streakDays: 0 });
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [searchQuery, filterTags, startDate, endDate]);

	// 初始加载
	useEffect(() => {
		loadData();
	}, [loadData]);

	// 执行搜索
	const handleSearch = () => {
		setSearchQuery(searchInput);
		setFilterTags(tagsInput);
		setStartDate(startDateInput);
		setEndDate(endDateInput);
	};

	// 清除筛选
	const handleClear = () => {
		setSearchInput("");
		setTagsInput("");
		setStartDateInput("");
		setEndDateInput("");
		setSearchQuery("");
		setFilterTags("");
		setStartDate("");
		setEndDate("");
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">三省</h1>
				<div className="text-sm opacity-70 mt-1">记录每日思考，审视内心成长</div>
			</div>

			<StatsCards stats={stats} />

			<ReflectionInput date={todayDate} onSuccess={loadData} />

			<div className="space-y-3">
				<div className="flex gap-3 flex-wrap">
					<input
						type="text"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSearch()}
						placeholder="搜索主题或内容..."
						className="flex-1 min-w-[200px] px-3 py-2 border border-[color:var(--border-color)] bg-[color:var(--surface)] rounded-xl placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
					/>
				</div>

				<div className="flex gap-3 items-center flex-wrap">
					<span className="text-sm opacity-70">日期范围：</span>
					<DatePicker 
						date={startDateInput} 
						onDateChange={setStartDateInput}
						placeholder="开始日期"
					/>
					<span className="opacity-70">至</span>
					<DatePicker 
						date={endDateInput} 
						onDateChange={setEndDateInput}
						placeholder="结束日期"
					/>
					<button
						onClick={handleSearch}
						className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm font-medium"
					>
						搜索
					</button>
					{(searchInput || startDateInput || endDateInput) && (
						<button
							onClick={handleClear}
							className="px-4 py-2 border border-[color:var(--border-color)] rounded-xl hover:bg-[color:var(--surface-strong)] transition-colors text-sm"
						>
							清除
						</button>
					)}
				</div>
			</div>

			{loading ? (
				<div className="text-center py-8 opacity-70">加载中...</div>
			) : (
				<>
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-medium opacity-70">
							共 {reflections.length} 条记录
						</h3>
					</div>
					<ReflectionList reflections={reflections} onUpdate={loadData} />
				</>
			)}
		</div>
	);
}
