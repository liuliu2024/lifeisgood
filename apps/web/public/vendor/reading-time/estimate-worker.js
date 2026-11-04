const chinesePunctuation =
  "，。！？；：、（）【】《》“”‘’…—·［］｛｝〈〉「」『』〔〕～　";
self.onmessage = ({ data }) => {
  try {
    const { text, speed } = data;
    if (
      typeof text !== "string" ||
      text.length > 20000 ||
      new TextEncoder().encode(text).length > 65536
    )
      throw Error("输入最多20000字符且不超过64KiB。");
    if (!/^(?:[1-9]\d{2}|1000)$/.test(speed))
      throw Error("请填写100–1000之间的整数速度。");
    const normalized = text.replace(/\r\n?/g, "\n");
    for (const c of normalized) {
      const n = c.charCodeAt(0);
      if (
        !(
          (n >= 32 && n <= 126) ||
          "\n\t".includes(c) ||
          (n >= 0x4e00 && n <= 0x9fff) ||
          chinesePunctuation.includes(c)
        )
      )
        throw Error(
          "暂只接常用汉字、ASCII英文数字和常见中文标点；不支持emoji、扩展汉字、片假名或全角字母数字。",
        );
    }
    self.module = { exports: {} };
    try {
      importScripts("./reading-time.js");
    } catch {
      throw Error("本机估时组件加载失败，请重试。");
    }
    const readingTime = self.module.exports;
    if (typeof readingTime !== "function")
      throw Error("本机估时组件不可用，请重试。");
    const boundary = (c) =>
      typeof c === "string" &&
      (" \t\n\r".includes(c) || chinesePunctuation.includes(c));
    const result = readingTime(normalized, {
      wordsPerMinute: Number(speed),
      wordBound: boundary,
    });
    if (
      !Number.isInteger(result.words) ||
      result.words < 0 ||
      !Number.isFinite(result.minutes) ||
      !Number.isInteger(result.time) ||
      result.time < 0
    )
      throw Error("本机组件返回值异常，请重试。");
    self.postMessage({
      ok: true,
      result: {
        library: "reading-time1.5.0",
        units: result.words,
        speedUnitsPerMinute: Number(speed),
        minutes: result.minutes,
        milliseconds: result.time,
        upstreamDisplayText: result.text,
        text: normalized,
        definition:
          "BMP常用汉字按字；ASCII英文/数字/符号按空白或常见中文标点隔开的连续片段，纯ASCII符号片段也可能计1。平台向原函数提供上述中文标点分隔选项，非语言分词。",
        punctuationBoundaries: chinesePunctuation,
        limitations:
          "仅按你填写的速度做算术估时，不评估阅读能力、智力、学习效率或实际读速，不估朗读/读屏。",
      },
    });
  } catch (e) {
    self.postMessage({
      ok: false,
      error:
        e instanceof Error && /^[\u4e00-\u9fff]/.test(e.message)
          ? e.message
          : "估算失败，请重试。",
    });
  }
};
