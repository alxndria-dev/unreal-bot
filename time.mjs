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
