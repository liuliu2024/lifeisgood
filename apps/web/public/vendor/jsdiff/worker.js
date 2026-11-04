// Lifeisgood bounded wrapper, repository MIT license. Upstream modules are unchanged BSD-3-Clause.
import {diffChars} from "./character.js";

function validate(text) {
  if (typeof text !== "string") throw Error("输入必须是文字。");
  if (text.length > 20000 || new TextEncoder().encode(text).length > 48 * 1024 || text.split(/\r\n|\r|\n/).length > 1000) throw Error("每段最多20000字符、48KiB UTF-8、1000行，请缩短文字。");
  for (const char of text) { const point = char.codePointAt(0); if (point === 0 || (point >= 0xd800 && point <= 0xdfff)) throw Error("文字含空字符或不完整的Unicode字符，请修正后重试。"); }
}

self.onmessage = event => {
  try {
    const {oldText, newText} = event.data;
    validate(oldText); validate(newText);
    const parts = diffChars(oldText, newText, {timeout: 1000, maxEditLength: 2000, ignoreCase: false});
    if (!parts) throw Error("差异过多或计算超时，已停止。请缩短两段文字再试。");
    if (parts.length > 4001) throw Error("结果分段过多，请缩短文字。");
    const changes = parts.map(part => ({type: part.added ? "add" : part.removed ? "remove" : "equal", value: part.value}));
    if (changes.filter(c => c.type !== "add").map(c => c.value).join("") !== oldText || changes.filter(c => c.type !== "remove").map(c => c.value).join("") !== newText) throw Error("结果校验失败，请重试。");
    const counts = {equal: 0, remove: 0, add: 0};
    for (const change of changes) counts[change.type] += Array.from(change.value).length;
    const result = {schema: "lifeisgood.text-diff.v1", library: "jsdiff 8.0.2 diffChars", unit: "Unicode code points; not grapheme clusters", counts, changes};
    if (new TextEncoder().encode(JSON.stringify(result)).length > 512 * 1024) throw Error("结果超过512KiB，请缩短文字。");
    self.postMessage({type: "result", result});
  } catch (error) { self.postMessage({type: "error", message: error instanceof Error ? error.message : "比较失败，请重试。"}); }
};
self.postMessage({type: "ready"});
