export const DEFAULT_TZ_OFFSET_MINUTES = 8 * 60;

export function ymdInOffset(d = new Date(), offsetMinutes = DEFAULT_TZ_OFFSET_MINUTES) {
	return new Date(d.getTime() + offsetMinutes * 60_000).toISOString().slice(0, 10);
}

export function ymInOffset(d = new Date(), offsetMinutes = DEFAULT_TZ_OFFSET_MINUTES) {
	return new Date(d.getTime() + offsetMinutes * 60_000).toISOString().slice(0, 7);
}

export function yInOffset(d = new Date(), offsetMinutes = DEFAULT_TZ_OFFSET_MINUTES) {
	return new Date(d.getTime() + offsetMinutes * 60_000).toISOString().slice(0, 4);
}

export function isoWeekKeyInOffset(d = new Date(), offsetMinutes = DEFAULT_TZ_OFFSET_MINUTES) {
	const shifted = new Date(d.getTime() + offsetMinutes * 60_000);
	const base = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
	const dayNum = base.getUTCDay() || 7;
	base.setUTCDate(base.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(base.getUTCFullYear(), 0, 1));
	const weekNo = Math.ceil(((base.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return `${base.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function utcMsForOffsetMidnight(ymd: string, offsetMinutes = DEFAULT_TZ_OFFSET_MINUTES) {
	const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) return NaN;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return NaN;
	return Date.UTC(y, mo - 1, d, 0, 0, 0, 0) - offsetMinutes * 60_000;
}
