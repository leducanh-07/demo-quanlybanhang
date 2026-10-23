/**
 * Vietnam Timezone Helpers (Asia/Ho_Chi_Minh, UTC+7)
 * All DATETIME/DATE values are stored as strings in Vietnam local time.
 */

const VN_TZ = "Asia/Ho_Chi_Minh";

/**
 * Returns current Vietnam time as 'YYYY-MM-DD HH:MM:SS'
 */
export function nowVN(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      map[p.type] = p.value;
    }
  }

  // hour can sometimes format as '24' in some node versions with hour12: false
  const hour = map.hour === "24" ? "00" : map.hour;
  return `${map.year}-${map.month}-${map.day} ${hour}:${map.minute}:${map.second}`;
}

/**
 * Returns current Vietnam date as 'YYYY-MM-DD'
 */
export function todayVN(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      map[p.type] = p.value;
    }
  }

  return `${map.year}-${map.month}-${map.day}`;
}

/**
 * Calculates hours elapsed between two VN DATETIME strings
 */
export function hoursBetween(startVN: string, endVN: string): number {
  const startMs = parseVNDateTime(startVN).getTime();
  const endMs = parseVNDateTime(endVN).getTime();
  return (endMs - startMs) / (1000 * 60 * 60);
}

export function durationSecondsBetween(startVN: string, endVN: string): number {
  const startMs = parseVNDateTime(startVN).getTime();
  const endMs = parseVNDateTime(endVN).getTime();
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

export function formatDurationSeconds(durationSeconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationSeconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours} giờ ${minutes} phút ${seconds} giây`;
}

/**
 * Parses a 'YYYY-MM-DD HH:MM:SS' or 'YYYY-MM-DD' string in VN time into a Date object
 */
export function parseVNDateTime(vnStr: string): Date {
  const [datePart, timePart = "00:00:00"] = vnStr.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour = 0, minute = 0, second = 0] = timePart.split(":").map(Number);

  // Return Date representing UTC equivalent of Asia/Ho_Chi_Minh (+07:00)
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, second));
}

/**
 * Format 'YYYY-MM-DD HH:MM:SS' to HH:mm
 */
export function formatTimeOnly(vnStr: string | null | undefined): string {
  if (!vnStr) return "";
  const parts = vnStr.split(" ");
  if (parts.length > 1) {
    const timeParts = parts[1].split(":");
    return `${timeParts[0]}:${timeParts[1]}`;
  }
  return vnStr;
}

/**
 * Format 'YYYY-MM-DD' to DD/MM/YYYY
 */
export function formatDateVN(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const datePart = dateStr.split(" ")[0];
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

/**
 * Format 'YYYY-MM-DD HH:MM:SS' to HH:mm DD/MM/YYYY
 */
export function formatDateTimeVN(vnStr: string | null | undefined): string {
  if (!vnStr) return "";
  const parts = vnStr.split(" ");
  const dateFormatted = formatDateVN(parts[0]);
  if (parts.length > 1) {
    const timeParts = parts[1].split(":");
    return `${timeParts[0]}:${timeParts[1]} ${dateFormatted}`;
  }
  return dateFormatted;
}
