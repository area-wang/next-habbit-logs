"use client";

import ReflectionCard from "./reflection-card";

interface Reflection {
	id: string;
	title: string | null;
	tags: string[];
	sideTags?: any[];
	content: string;
	createdAt: number;
	updatedAt: number;
}

export default function ReflectionList({
	reflections,
	onUpdate,
}: {
	reflections: Reflection[];
	onUpdate: () => void;
}) {
	if (reflections.length === 0) {
		return (
			<div className="text-center py-12">
				<p className="opacity-70">暂无反思记录</p>
				<p className="text-sm opacity-50 mt-1">开始记录你的思考吧</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{reflections.map((reflection) => (
				<ReflectionCard
					key={reflection.id}
					reflection={reflection}
					onUpdate={onUpdate}
					onDelete={onUpdate}
				/>
			))}
		</div>
	);
}
