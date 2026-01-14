"use client";

import { useState } from "react";
import ReflectionEditModal from "./reflection-edit-modal";

export default function ReflectionInput({
	date,
	onSuccess,
}: {
	date: string;
	onSuccess: () => void;
}) {
	const [showModal, setShowModal] = useState(false);

	return (
		<>
			<button
				onClick={() => setShowModal(true)}
				className="w-full border-2 border-dashed border-[color:var(--border-color)] bg-[color:var(--surface)] rounded-2xl p-6 hover:bg-[color:var(--surface-strong)] hover:border-purple-500/50 transition-all group"
			>
				<div className="flex flex-col items-center gap-2">
					<svg
						className="w-8 h-8 opacity-50 group-hover:opacity-70 transition-opacity"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 4v16m8-8H4"
						/>
					</svg>
					<span className="text-lg opacity-70 group-hover:opacity-100 transition-opacity">
						提笔落墨，记录今日思考
					</span>
				</div>
			</button>

			<ReflectionEditModal
				open={showModal}
				onClose={() => setShowModal(false)}
				date={date}
				onSuccess={onSuccess}
			/>
		</>
	);
}

