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
				className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
			>
				<svg
					className="w-4 h-4"
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
				新建
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

