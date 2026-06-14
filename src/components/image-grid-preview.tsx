"use client";

import { useState } from "react";
import ImagePreviewModal from "./image-preview-modal";

interface ImageGridPreviewProps {
	images: string[];
	className?: string;
}

export default function ImageGridPreview({ images, className = "" }: ImageGridPreviewProps) {
	const [previewIndex, setPreviewIndex] = useState(0);
	const [previewOpen, setPreviewOpen] = useState(false);

	if (!images || images.length === 0) return null;

	return (
		<>
			<div className={`flex flex-wrap gap-1 ${className}`}>
				{images.map((img, idx) => (
					<button
						key={idx}
						type="button"
						onClick={() => {
							setPreviewIndex(idx);
							setPreviewOpen(true);
						}}
						className="w-[30px] h-[30px] rounded border border-black/10 overflow-hidden hover:ring-2 hover:ring-purple-400 transition-all flex-shrink-0"
					>
						<img src={img} alt={`图片 ${idx + 1}`} className="w-full h-full object-cover" />
					</button>
				))}
			</div>

			<ImagePreviewModal
				images={images}
				currentIndex={previewIndex}
				open={previewOpen}
				onOpenChange={setPreviewOpen}
				onNavigate={setPreviewIndex}
			/>
		</>
	);
}
