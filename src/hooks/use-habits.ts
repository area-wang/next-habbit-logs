"use client";

import useSWR from "swr";
import type { Habit, HabitCategory, TagStats, HabitWithCategory } from "@/lib/types";
import { parseTags } from "@/lib/habit-utils";

const fetcher = async (url: string): Promise<any> => {
	const res = await fetch(url);
	return res.json();
};

/**
 * 获取习惯列表
 */
export function useHabits(params?: {
	archived?: boolean;
	categoryId?: string;
	tags?: string[];
	tagMatch?: "any" | "all";
}) {
	const searchParams = new URLSearchParams();
	
	if (params?.archived) {
		searchParams.set("archived", "true");
	}
	
	if (params?.categoryId) {
		searchParams.set("category_id", params.categoryId);
	}
	
	if (params?.tags && params.tags.length > 0) {
		searchParams.set("tags", params.tags.join(","));
	}
	
	if (params?.tagMatch) {
		searchParams.set("tag_match", params.tagMatch);
	}
	
	const url = `/api/habits${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
	
	const { data, error, isLoading, mutate } = useSWR<{ habits: Habit[] }>(url, fetcher, {
		revalidateOnFocus: false,
	});
	
	// 解析标签并添加分类信息
	const habitsWithParsedTags: HabitWithCategory[] = (data?.habits || []).map((habit) => ({
		...habit,
		parsedTags: parseTags(habit.tags),
	}));
	
	return {
		habits: habitsWithParsedTags,
		isLoading,
		error,
		mutate,
	};
}

/**
 * 获取分类列表
 */
export function useCategories() {
	const { data, error, isLoading, mutate } = useSWR<HabitCategory[]>("/api/categories", fetcher, {
		revalidateOnFocus: false,
	});
	
	return {
		categories: data || [],
		isLoading,
		error,
		mutate,
	};
}

/**
 * 获取标签列表
 */
export function useTags() {
	const { data, error, isLoading, mutate } = useSWR<TagStats[]>("/api/tags", fetcher, {
		revalidateOnFocus: false,
	});
	
	return {
		tags: data || [],
		isLoading,
		error,
		mutate,
	};
}

/**
 * 归档习惯
 */
export async function archiveHabit(habitId: string, note?: string): Promise<{ success: boolean }> {
	const response = await fetch(`/api/habits/${habitId}/archive`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ note }),
	});
	
	if (!response.ok) {
		const error = await response.json() as any;
		throw new Error(error.error || "归档失败");
	}
	
	return response.json();
}

/**
 * 恢复习惯
 */
export async function restoreHabit(habitId: string): Promise<{ success: boolean }> {
	const response = await fetch(`/api/habits/${habitId}/restore`, {
		method: "POST",
	});
	
	if (!response.ok) {
		const error = await response.json() as any;
		throw new Error(error.error || "恢复失败");
	}
	
	return response.json();
}

/**
 * 删除习惯
 */
export async function deleteHabit(habitId: string): Promise<{ success: boolean }> {
	const response = await fetch(`/api/habits/${habitId}`, {
		method: "DELETE",
	});
	
	if (!response.ok) {
		const error = await response.json() as any;
		throw new Error(error.error || "删除失败");
	}
	
	return response.json();
}

/**
 * 更新习惯
 */
export async function updateHabit(habitId: string, updates: Partial<Habit>): Promise<Habit> {
	const response = await fetch(`/api/habits/${habitId}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(updates),
	});
	
	if (!response.ok) {
		const error = await response.json() as any;
		throw new Error(error.error || "更新失败");
	}
	
	return response.json();
}

/**
 * 批量操作习惯
 */
export async function batchOperateHabits(
	habitIds: string[],
	operation: "archive" | "restore" | "delete" | "update",
	data?: any
) {
	const response = await fetch("/api/habits/batch", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ habitIds, operation, data }),
	});
	
	if (!response.ok) {
		const error = await response.json() as any;
		throw new Error(error.error || "批量操作失败");
	}
	
	return response.json();
}

/**
 * 创建分类
 */
export async function createCategory(category: {
	name: string;
	color: string;
	icon?: string;
}): Promise<HabitCategory> {
	const response = await fetch("/api/categories", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(category),
	});
	
	if (!response.ok) {
		const error = await response.json() as any;
		throw new Error(error.error || "创建分类失败");
	}
	
	return response.json();
}

/**
 * 更新分类
 */
export async function updateCategory(
	categoryId: string,
	updates: Partial<HabitCategory>
): Promise<HabitCategory> {
	const response = await fetch(`/api/categories/${categoryId}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(updates),
	});
	
	if (!response.ok) {
		const error = await response.json() as { error?: string };
		throw new Error(error.error || "更新分类失败");
	}
	
	return response.json();
}

/**
 * 删除分类
 */
export async function deleteCategory(categoryId: string): Promise<{ success: boolean }> {
	const response = await fetch(`/api/categories/${categoryId}`, {
		method: "DELETE",
	});
	
	if (!response.ok) {
		const error = await response.json() as { error?: string };
		throw new Error(error.error || "删除分类失败");
	}
	
	return response.json();
}

/**
 * 合并标签
 */
export async function mergeTags(
	sourceTags: string[],
	targetTag: string
): Promise<{ success: boolean; affectedHabits: number }> {
	const response = await fetch("/api/tags/merge", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ sourceTags, targetTag }),
	});
	
	if (!response.ok) {
		const error = await response.json() as { error?: string };
		throw new Error(error.error || "合并标签失败");
	}
	
	return response.json();
}
