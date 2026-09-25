export function nextRoRTime(input) {
  const match = /^([01]\d|2[0-3])([0-5]\d)$/.exec(input);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const now = new Date();
  const serverNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  let timestamp =
    Date.UTC(
      serverNow.getUTCFullYear(),
      serverNow.getUTCMonth(),
      serverNow.getUTCDate(),
      hour,
      minute,
    ) -
    2 * 60 * 60 * 1000;

  if (
    timestamp <= now.getTime() &&
    !(serverNow.getUTCHours() === hour && serverNow.getUTCMinutes() === minute)
  ) {
    timestamp += 24 * 60 * 60 * 1000;
  }

  return Math.floor(timestamp / 1000);
}

export function roRDateTime(dateInput, timeInput) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
  const timeMatch = /^([01]\d|2[0-3])([0-5]\d)$/.exec(timeInput);

  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  const timestamp =
    Date.UTC(year, month - 1, day, hour, minute) - 2 * 60 * 60 * 1000;

  const date = new Date(timestamp + 2 * 60 * 60 * 1000);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return Math.floor(timestamp / 1000);
}

export function formatTimeRemaining(unix) {
  const totalMinutes = Math.max(
    0,
    Math.floor((unix * 1000 - Date.now()) / 60_000),
  );

  if (totalMinutes === 0) return "NOW";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    hours +
    " " +
    (hours === 1 ? "hour" : "hours") +
    " " +
    minutes +
    " " +
    (minutes === 1 ? "minute" : "minutes")
  );
}
