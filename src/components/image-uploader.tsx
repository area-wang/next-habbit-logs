"use client";

import { useState, useRef } from "react";
import ImagePreviewModal from "./image-preview-modal";

interface ImageUploaderProps {
	images: string[];
	onChange: (images: string[]) => void;
	disabled?: boolean;
	maxWidth?: number;
	maxSizeKB?: number;
}

export default function ImageUploader({
	images,
	onChange,
	disabled = false,
	maxWidth = 800,
	maxSizeKB = 200,
}: ImageUploaderProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [compressing, setCompressing] = useState(false);
	const [previewIndex, setPreviewIndex] = useState(0);
	const [previewOpen, setPreviewOpen] = useState(false);

	async function compressImage(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement("canvas");
					let width = img.width;
					let height = img.height;

					// 按比例缩放
					if (width > maxWidth) {
						height = (height * maxWidth) / width;
						width = maxWidth;
					}

					canvas.width = width;
					canvas.height = height;

					const ctx = canvas.getContext("2d");
					if (!ctx) {
						reject(new Error("无法获取canvas context"));
						return;
					}

					ctx.drawImage(img, 0, 0, width, height);

					// 尝试不同的质量来达到目标大小
					let quality = 0.9;
					let dataUrl = canvas.toDataURL("image/jpeg", quality);

					// 如果还是太大，降低质量
					while (dataUrl.length > maxSizeKB * 1024 * 1.37 && quality > 0.1) {
						quality -= 0.1;
						dataUrl = canvas.toDataURL("image/jpeg", quality);
					}

					resolve(dataUrl);
				};
				img.onerror = () => reject(new Error("图片加载失败"));
				img.src = e.target?.result as string;
			};
			reader.onerror = () => reject(new Error("文件读取失败"));
			reader.readAsDataURL(file);
		});
	}

	async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(e.target.files || []);
		if (files.length === 0) return;

		setCompressing(true);
		try {
			const compressedImages: string[] = [];
			for (const file of files) {
				if (!file.type.startsWith("image/")) continue;
				try {
					const compressed = await compressImage(file);
					compressedImages.push(compressed);
				} catch (err) {
					console.error("压缩图片失败:", err);
				}
			}
			onChange([...images, ...compressedImages]);
		} finally {
			setCompressing(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	}

	function removeImage(index: number) {
		onChange(images.filter((_, i) => i !== index));
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<label className="text-xs font-medium opacity-70">图片（可选）</label>
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					disabled={disabled || compressing}
					className="text-xs px-2 py-1 rounded-lg border border-black/10 hover:bg-black/5 transition-colors disabled:opacity-50"
				>
					{compressing ? "压缩中..." : "+ 添加图片"}
				</button>
			</div>

			{images.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{images.map((img, index) => (
						<div key={index} className="relative group">
							<button
								type="button"
								onClick={() => {
									setPreviewIndex(index);
									setPreviewOpen(true);
								}}
								className="w-[30px] h-[30px] rounded border border-black/10 overflow-hidden hover:ring-2 hover:ring-purple-400 transition-all flex-shrink-0 block"
							>
								<img
									src={img}
									alt={`图片 ${index + 1}`}
									className="w-full h-full object-cover"
								/>
							</button>
							<button
								type="button"
								onClick={() => removeImage(index)}
								disabled={disabled}
								className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 z-10 text-xs leading-none"
								aria-label="删除图片"
							>
								×
							</button>
						</div>
					))}
				</div>
			)}

			<input
				ref={fileInputRef}
				type="file"
				accept="image/jpeg,image/png,image/webp,image/jpg"
				multiple
				onChange={handleFileSelect}
				disabled={disabled}
				className="hidden"
			/>

			<div className="text-xs opacity-60">
				支持 JPG、PNG、WebP 格式，自动压缩到 {maxSizeKB}KB 以下
			</div>

			<ImagePreviewModal
				images={images}
				currentIndex={previewIndex}
				open={previewOpen}
				onOpenChange={setPreviewOpen}
				onNavigate={setPreviewIndex}
			/>
		</div>
	);
}
