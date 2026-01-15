"use client";

import { HabitCategory } from "@/lib/types";

interface CategoryFilterProps {
	categories: HabitCategory[];
	selectedCategory: string | null;
	onSelectCategory: (categoryId: string | null) => void;
	habitCounts: Record<string, number>;
}

export default function CategoryFilter({
	categories,
	selectedCategory,
	onSelectCategory,
	habitCounts,
}: CategoryFilterProps) {
	const totalCount = Object.values(habitCounts).reduce((sum, count) => sum + count, 0);
	const uncategorizedCount = habitCounts["uncategorized"] || 0;

	return (
		<div className="rounded-xl border border-black/10 p-3">
			<div className="text-sm font-medium mb-2">分类筛选</div>
			<div className="flex flex-wrap gap-2">
				<button
					className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
						selectedCategory === null
							? "bg-purple-600 text-white"
							: "border border-black/10 hover:bg-black/5"
					}`}
					onClick={() => onSelectCategory(null)}
				>
					全部 ({totalCount})
				</button>
				{categories.map((category) => (
					<button
						key={category.id}
						className={`px-3 py-1.5 rounded-full text-sm transition-colors inline-flex items-center gap-2 ${
							selectedCategory === category.id
								? "text-white"
								: "border border-black/10 hover:bg-black/5"
						}`}
						style={
							selectedCategory === category.id
								? { backgroundColor: category.color }
								: undefined
						}
						onClick={() => onSelectCategory(category.id)}
					>
						<span
							className="w-2 h-2 rounded-full"
							style={{ backgroundColor: category.color }}
						/>
						{category.name} ({habitCounts[category.id] || 0})
					</button>
				))}
				{uncategorizedCount > 0 && (
					<button
						className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
							selectedCategory === "uncategorized"
								? "bg-gray-500 text-white"
								: "border border-black/10 hover:bg-black/5"
						}`}
						onClick={() => onSelectCategory("uncategorized")}
					>
						未分类 ({uncategorizedCount})
					</button>
				)}
			</div>
		</div>
	);
}
