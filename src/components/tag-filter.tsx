"use client";

import { TagStats } from "@/lib/types";

interface TagFilterProps {
	allTags: TagStats[];
	selectedTags: string[];
	onSelectTags: (tags: string[]) => void;
	matchMode: "any" | "all";
	onMatchModeChange: (mode: "any" | "all") => void;
}

export default function TagFilter({
	allTags,
	selectedTags,
	onSelectTags,
	matchMode,
	onMatchModeChange,
}: TagFilterProps) {
	const toggleTag = (tag: string) => {
		if (selectedTags.includes(tag)) {
			onSelectTags(selectedTags.filter((t) => t !== tag));
		} else {
			onSelectTags([...selectedTags, tag]);
		}
	};

	const clearTags = () => {
		onSelectTags([]);
	};

	return (
		<div className="rounded-xl border border-black/10 p-3">
			<div className="flex items-center justify-between mb-2">
				<div className="text-sm font-medium">标签筛选</div>
				{selectedTags.length > 0 && (
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-1 text-xs">
							<button
								className={`px-2 py-1 rounded-lg transition-colors ${
									matchMode === "any"
										? "bg-purple-600 text-white"
										: "border border-black/10 hover:bg-black/5"
								}`}
								onClick={() => onMatchModeChange("any")}
							>
								任一
							</button>
							<button
								className={`px-2 py-1 rounded-lg transition-colors ${
									matchMode === "all"
										? "bg-purple-600 text-white"
										: "border border-black/10 hover:bg-black/5"
								}`}
								onClick={() => onMatchModeChange("all")}
							>
								全部
							</button>
						</div>
						<button
							className="text-xs px-2 py-1 rounded-lg border border-black/10 hover:bg-black/5 transition-colors"
							onClick={clearTags}
						>
							清除
						</button>
					</div>
				)}
			</div>
			{allTags.length === 0 ? (
				<div className="text-sm opacity-70">暂无标签</div>
			) : (
				<div className="flex flex-wrap gap-2">
					{allTags.map((tagStat) => {
						const isSelected = selectedTags.includes(tagStat.tag);
						return (
							<button
								key={tagStat.tag}
								className={`px-3 py-1.5 rounded-full text-sm transition-colors inline-flex items-center gap-1.5 ${
									isSelected
										? "bg-purple-600 text-white"
										: "border border-black/10 hover:bg-black/5"
								}`}
								onClick={() => toggleTag(tagStat.tag)}
							>
								{tagStat.tag}
								<span className="text-xs opacity-70">({tagStat.count})</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
