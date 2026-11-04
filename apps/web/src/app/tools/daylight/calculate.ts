export type Inputs = { latitude: string; longitude: string; date: string; offset: string };
export type SunCalc = { getTimes(date: Date, latitude: number, longitude: number, height: number): Record<string, Date>; getPosition(date: Date, latitude: number, longitude: number): { altitude: number } };
const day = 86400000;
const definitions = { dawn: "民用晨光开始", sunrise: "近似日出", solarNoon: "太阳过中天", sunset: "近似日落", dusk: "民用暮光结束" };
type Key = keyof typeof definitions;
export type Event = { key: Key; label: string; utc: string; local: string; minutesIntoDay: number };
export type Result = ReturnType<typeof calculate>;
export const stateNames = { crossings: "本日有日出或日落", "continuous-daylight": "全天日照（近似极昼）", "continuous-night": "全天无日照（近似极夜）" };

export function parse(input: Inputs) {
  const numeric = /^[+-]?(?:\d{1,3}(?:\.\d{1,6})?|\.\d{1,6})$/;
  const lat = input.latitude.trim(), lng = input.longitude.trim();
  if (!numeric.test(lat) || !Number.isFinite(Number(lat)) || Math.abs(Number(lat)) > 90) throw new Error("纬度请填写-90到90的十进制数字，最多6位小数，北纬为正。");
  if (!numeric.test(lng) || !Number.isFinite(Number(lng)) || Math.abs(Number(lng)) > 180) throw new Error("经度请填写-180到180的十进制数字，最多6位小数，东经为正。");
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(input.date)) throw new Error("日期仅支持2000-01-01至2099-12-31。");
  const midnight = Date.parse(`${input.date}T00:00:00Z`);
  if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0, 10) !== input.date) throw new Error("日期不存在，请检查月份、天数或闰年。");
  const offset = /^([+-])(\d{2}):(00|15|30|45)$/.exec(input.offset.trim());
  if (!offset) throw new Error("固定UTC偏移请用+08:00或-05:00格式，分钟只支持00/15/30/45。");
  const magnitude = Number(offset[2]) * 60 + Number(offset[3]), offsetMinutes = (offset[1] === "-" ? -1 : 1) * magnitude;
  if (offsetMinutes < -720 || offsetMinutes > 840) throw new Error("UTC偏移仅支持-12:00至+14:00。");
  return { latitude: Number(lat), longitude: Number(lng), date: input.date, offset: input.offset.trim(), offsetMinutes, start: midnight - offsetMinutes * 60000 };
}

export function calculate(sun: SunCalc, input: Inputs) {
  const checked = parse(input), { start, offsetMinutes, latitude, longitude } = checked, end = start + day;
  const local = (milliseconds: number) => new Date(milliseconds + offsetMinutes * 60000).toISOString().slice(0, 19).replace("T", " ");
  const candidates: { key: Key; time: number }[] = [], seen = new Set<string>();
  // A user-selected civil day can straddle two solar cycles, especially near the date line.
  // Examine a bounded five-cycle neighborhood, then keep only this fixed-offset 24-hour interval.
  for (let shift = -2; shift <= 2; shift++) {
    const times = sun.getTimes(new Date(start + day / 2 + shift * day), latitude, longitude, 0);
    if (!times || typeof times !== "object") throw new Error("日光组件返回异常，请重新加载组件。");
    for (const key of Object.keys(definitions) as Key[]) {
      const value = times[key];
      if (!(value instanceof Date)) throw new Error("日光组件返回异常，请重新加载组件。");
      const time = value.getTime();
      if (!Number.isFinite(time)) continue; // Polar no-crossing cases yield invalid Date values in this release.
      const id = `${key}:${time}`;
      if (!seen.has(id)) { candidates.push({ key, time }); seen.add(id); }
    }
  }
  candidates.sort((a, b) => a.time - b.time);
  const inDay = candidates.filter(event => event.time >= start && event.time < end);
  const events: Event[] = inDay.map(event => ({ key: event.key, label: definitions[event.key], utc: new Date(event.time).toISOString(), local: local(event.time), minutesIntoDay: (event.time - start) / 60000 }));
  const crossings = candidates.filter(event => event.key === "sunrise" || event.key === "sunset");
  const before = crossings.filter(event => event.time < start).at(-1);
  const next = crossings.find(event => event.time >= start);
  let above: boolean;
  if (before) above = before.key === "sunrise";
  else if (next) above = next.key === "sunset";
  else {
    const altitude = sun.getPosition(new Date(start + 1), latitude, longitude).altitude;
    if (!Number.isFinite(altitude)) throw new Error("日光状态无法计算，请检查输入后重试。");
    above = altitude >= -.833 * Math.PI / 180;
  }
  const aboveAtStart = above, segments: { fromMinutes: number; toMinutes: number }[] = [];
  let cursor = start;
  const dailyCrossings = crossings.filter(event => event.time >= start && event.time < end);
  for (const event of dailyCrossings) {
    if (above && event.time > cursor) segments.push({ fromMinutes: (cursor - start) / 60000, toMinutes: (event.time - start) / 60000 });
    above = event.key === "sunrise"; cursor = event.time;
  }
  if (above && end > cursor) segments.push({ fromMinutes: (cursor - start) / 60000, toMinutes: 1440 });
  const daylightMinutes = segments.reduce((sum, segment) => sum + segment.toMinutes - segment.fromMinutes, 0);
  const state: keyof typeof stateNames = dailyCrossings.length ? "crossings" : aboveAtStart ? "continuous-daylight" : "continuous-night";
  return { schemaVersion: 1, generator: "SunCalc", version: "1.9.0", inputs: { latitude, longitude, date: checked.date, utcOffset: checked.offset, utcOffsetMinutes: offsetMinutes }, interval: { startUtc: new Date(start).toISOString(), endUtcExclusive: new Date(end).toISOString() }, state, stateLabel: stateNames[state], daylightMinutes, daylightSegments: segments, events, assumptions: { observerHeightMetres: 0, horizonSunCentreDegrees: -.833, civilTwilightDegrees: -6, fixedUtcOffset: true, automaticDst: false, precision: "近似时段，导出UTC秒仅供复核，不代表秒级精度", excluded: ["地形与遮挡", "海拔高度修正", "实际大气折射与天气", "自动夏令时/历史时区规则"] } };
}

export function duration(minutes: number) { const rounded = Math.round(minutes); return `${Math.floor(rounded / 60)}小时${String(rounded % 60).padStart(2, "0")}分`; }
export function asText(result: Result) {
  return [`本机近似日光时段 · SunCalc ${result.version}`, `日期：${result.inputs.date}，固定UTC${result.inputs.utcOffset}`, `纬度：${result.inputs.latitude}；经度：${result.inputs.longitude}`, `状态：${result.stateLabel}`, `民用日内日照：约${duration(result.daylightMinutes)}`, "", ...result.events.map(event => `${event.label}：约${event.local.slice(0, 16)}；UTC ${event.utc}`), "", "日出/日落不存在时不会填入虚构时间；极夜仍可能有民用暮光。", "按固定UTC偏移选取本地00:00至次日00:00；UTC日期可能跨到前/后一天。", "海拔固定0米，假设无遮挡平坦地平线，采用标准日出及民用暮光判定角。地形、遮挡、天气和实际折射未计。", "不自动处理夏令时，请填写所选日期当地实际偏移。仅为近似生活参考，不承诺天气、拍摄效果或安全/导航用途。"].join("\n") + "\n";
}
