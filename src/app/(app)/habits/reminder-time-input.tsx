"use client";

import { useState } from "react";
import TimeSelect from "../today/time-select";

interface ReminderTime {
	timeMin: number;
	endTimeMin?: number | null;
}

interface ReminderTimeInputProps {
	reminders: ReminderTime[];
	onChange: (reminders: ReminderTime[]) => void;
	disabled?: boolean;
}

function minToHHMM(min: number): string {
	const h = Math.floor(min / 60);
	const m = min % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToMin(hhmm: string): number | null {
	const match = hhmm.match(/^(\d{1,2}):(\d{2})$/);
	if (!match) return null;
	const h = Number(match[1]);
	const m = Number(match[2]);
	if (h < 0 || h > 23 || m < 0 || m > 59) return null;
	return h * 60 + m;
}

export function ReminderTimeInput({ reminders, onChange, disabled }: ReminderTimeInputProps) {
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");
	const [error, setError] = useState("");

	const handleAdd = () => {
		setError("");

		if (!startTime) {
			setError("请输入开始时间");
			return;
		}

		const timeMin = hhmmToMin(startTime);
		if (timeMin === null) {
			setError("开始时间格式无效");
			return;
		}

		let endTimeMin: number | null = null;
		if (endTime) {
			endTimeMin = hhmmToMin(endTime);
			if (endTimeMin === null) {
				setError("结束时间格式无效");
				return;
			}

			if (endTimeMin <= timeMin) {
				setError("结束时间必须晚于开始时间");
				return;
			}
		}

		// 检查是否已存在相同的开始时间
		if (reminders.some((r) => r.timeMin === timeMin)) {
			setError("该提醒时间已存在");
			return;
		}

		onChange([...reminders, { timeMin, endTimeMin }]);
		setStartTime("");
		setEndTime("");
	};

	const handleRemove = (index: number) => {
		onChange(reminders.filter((_, i) => i !== index));
	};

	return (
		<div className="space-y-3">
			{reminders.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{reminders.map((reminder, index) => (
						<div key={index} className="inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-1 text-xs">
							<span>
								{minToHHMM(reminder.timeMin)}
								{reminder.endTimeMin != null && ` - ${minToHHMM(reminder.endTimeMin)}`}
							</span>
							<button
								type="button"
								onClick={() => handleRemove(index)}
								disabled={disabled}
								className="opacity-70 hover:opacity-100 disabled:opacity-50"
								aria-label="删除提醒时间"
							>
								×
							</button>
						</div>
					))}
				</div>
			)}

			<div className="space-y-2">
				<div className="flex gap-2">
					<div className="w-32">
						<TimeSelect
							value={startTime}
							onChange={setStartTime}
							placeholder="开始时间"
							stepMin={5}
							disabled={disabled}
						/>
					</div>
					<div className="w-32">
						<TimeSelect
							value={endTime}
							onChange={setEndTime}
							placeholder="结束时间"
							stepMin={5}
							disabled={disabled}
						/>
					</div>
					<button
						type="button"
						onClick={handleAdd}
						disabled={disabled}
						className="h-10 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors disabled:opacity-50"
					>
						添加
					</button>
				</div>
				{error && <p className="text-xs text-red-600">{error}</p>}
			</div>
		</div>
	);
}
