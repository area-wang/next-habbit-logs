"use client";

interface MotivationInputProps {
	motivations: string[];
	onChange: (motivations: string[]) => void;
	disabled?: boolean;
}

export default function MotivationInput({ motivations, onChange, disabled = false }: MotivationInputProps) {
	const MAX_MOTIVATIONS = 5;

	const addMotivation = () => {
		if (motivations.length >= MAX_MOTIVATIONS) return;
		onChange([...motivations, ""]);
	};

	const updateMotivation = (index: number, value: string) => {
		const updated = [...motivations];
		updated[index] = value;
		onChange(updated);
	};

	const removeMotivation = (index: number) => {
		if (motivations.length <= 1) return; // 至少保留一个
		const updated = motivations.filter((_, i) => i !== index);
		onChange(updated);
	};

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<label className="text-xs font-medium opacity-70">动力 / 为什么要做</label>
				{motivations.length < MAX_MOTIVATIONS && (
					<button
						type="button"
						onClick={addMotivation}
						disabled={disabled}
						className="text-xs px-2 py-1 rounded-lg border border-black/10 hover:bg-black/5 transition-colors disabled:opacity-50"
					>
						+ 添加动力
					</button>
				)}
			</div>
			<div className="space-y-2">
				{motivations.map((motivation, index) => (
					<div key={index} className="flex items-start gap-2">
						<textarea
							className="flex-1 rounded-xl border border-black/10 bg-transparent px-3 py-2 outline-none text-sm resize-none"
							placeholder={`动力 ${index + 1}（例如：想要更健康的身体、为了给孩子做榜样）`}
							value={motivation}
							onChange={(e) => updateMotivation(index, e.target.value)}
							disabled={disabled}
							rows={2}
							maxLength={200}
						/>
						{motivations.length > 1 && (
							<button
								type="button"
								onClick={() => removeMotivation(index)}
								disabled={disabled}
								className="h-9 w-9 flex items-center justify-center rounded-lg border border-black/10 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-50"
								title="删除"
							>
								×
							</button>
						)}
					</div>
				))}
			</div>
			<div className="text-xs opacity-60">
				填写你做这个习惯的理由和目标，帮助你在想放弃时重新获得动力
			</div>
		</div>
	);
}
