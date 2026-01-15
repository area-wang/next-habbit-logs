"use client";

interface BatchToolbarProps {
	selectedCount: number;
	totalCount: number;
	viewMode: "active" | "archived";
	onSelectAll: () => void;
	onDeselectAll: () => void;
	onArchive: () => void;
	onRestore: () => void;
	onDelete: () => void;
	onEdit: () => void;
	onCancel: () => void;
}

export default function BatchToolbar({
	selectedCount,
	totalCount,
	viewMode,
	onSelectAll,
	onDeselectAll,
	onArchive,
	onRestore,
	onDelete,
	onEdit,
	onCancel,
}: BatchToolbarProps) {
	const allSelected = selectedCount === totalCount && totalCount > 0;

	return (
		<div className="sticky top-0 z-10 rounded-xl border border-purple-200 bg-purple-50 p-3 backdrop-blur">
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-3">
					<div className="text-sm font-medium">
						已选择 {selectedCount} 个习惯
					</div>
					<button
						className="text-xs px-2 py-1 rounded-lg border border-black/10 hover:bg-black/5 transition-colors"
						onClick={allSelected ? onDeselectAll : onSelectAll}
					>
						{allSelected ? "取消全选" : "全选"}
					</button>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{viewMode === "active" ? (
						<>
							<button
								className="h-9 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors text-sm inline-flex items-center gap-1"
								onClick={onEdit}
								disabled={selectedCount === 0}
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
									<path
										d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								批量编辑
							</button>
							<button
								className="h-9 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors text-sm inline-flex items-center gap-1"
								onClick={onArchive}
								disabled={selectedCount === 0}
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
									<path
										d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								归档
							</button>
						</>
					) : (
						<>
							<button
								className="h-9 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors text-sm inline-flex items-center gap-1"
								onClick={onRestore}
								disabled={selectedCount === 0}
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
									<path
										d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<path d="M21 3v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
								恢复
							</button>
							<button
								className="h-9 px-3 rounded-xl border border-red-200 hover:bg-red-50 transition-colors text-sm text-red-600 inline-flex items-center gap-1"
								onClick={onDelete}
								disabled={selectedCount === 0}
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
									<path
										d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								永久删除
							</button>
						</>
					)}
					<button
						className="h-9 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors text-sm"
						onClick={onCancel}
					>
						取消
					</button>
				</div>
			</div>
		</div>
	);
}
