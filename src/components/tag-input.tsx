"use client";

import { useState, useRef, useEffect } from "react";

interface TagInputProps {
	tags: string[];
	onChange: (tags: string[]) => void;
	suggestions?: string[];
	maxTags?: number;
	maxLength?: number;
	disabled?: boolean;
	placeholder?: string;
}

export default function TagInput({
	tags,
	onChange,
	suggestions = [],
	maxTags = 10,
	maxLength = 20,
	disabled = false,
	placeholder = "输入标签，按回车添加",
}: TagInputProps) {
	const [input, setInput] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const filteredSuggestions = suggestions
		.filter((s) => !tags.includes(s) && s.toLowerCase().includes(input.toLowerCase()))
		.slice(0, 5);

	const addTag = (tag: string) => {
		const trimmed = tag.trim();
		if (!trimmed) return;
		if (tags.length >= maxTags) return;
		if (tags.includes(trimmed)) return;
		if (trimmed.length > maxLength) return;
		onChange([...tags, trimmed]);
		setInput("");
		setShowSuggestions(false);
	};

	const removeTag = (index: number) => {
		onChange(tags.filter((_, i) => i !== index));
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			addTag(input);
		} else if (e.key === "Backspace" && !input && tags.length > 0) {
			removeTag(tags.length - 1);
		}
	};

	useEffect(() => {
		setShowSuggestions(input.length > 0 && filteredSuggestions.length > 0);
	}, [input, filteredSuggestions.length]);

	return (
		<div className="relative">
			<div className="w-full min-h-[40px] rounded-xl border border-black/10 bg-transparent px-3 py-2">
				<div className="flex flex-wrap gap-2 items-center">
					{tags.map((tag, index) => (
						<span
							key={index}
							className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs"
						>
							{tag}
							<button
								className="hover:opacity-70"
								onClick={() => removeTag(index)}
								disabled={disabled}
								aria-label={`删除标签 ${tag}`}
							>
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none">
									<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
								</svg>
							</button>
						</span>
					))}
					<input
						ref={inputRef}
						className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
						placeholder={tags.length === 0 ? placeholder : ""}
						value={input}
						onChange={(e) => setInput(e.target.value.slice(0, maxLength))}
						onKeyDown={handleKeyDown}
						onFocus={() => input && setShowSuggestions(true)}
						onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
						disabled={disabled || tags.length >= maxTags}
						maxLength={maxLength}
					/>
				</div>
			</div>

			{showSuggestions && filteredSuggestions.length > 0 && (
				<div className="absolute z-10 w-full mt-1 rounded-xl border border-black/10 bg-[color:var(--popover-bg)] backdrop-blur shadow-xl overflow-hidden">
					{filteredSuggestions.map((suggestion, index) => (
						<button
							key={index}
							className="w-full px-3 py-2 text-left text-sm hover:bg-black/5 transition-colors"
							onClick={() => addTag(suggestion)}
						>
							{suggestion}
						</button>
					))}
				</div>
			)}

			{tags.length >= maxTags && (
				<div className="text-xs text-orange-600 mt-1">
					已达到标签数量上限（{maxTags}个）
				</div>
			)}
		</div>
	);
}
