export const LIMIT = 5 * 1024 * 1024;
export function header(buffer: ArrayBuffer) {
  const a = new Uint8Array(buffer),
    d = new DataView(buffer);
  let width = 0,
    height = 0,
    format = "";
  const bound = () => {
    if (
      width < 1 ||
      height < 1 ||
      width > 2048 ||
      height > 2048 ||
      width * height > 4000000
    )
      throw Error("图片最多2048边长、400万像素。");
  };
  if (
    a.length >= 24 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => a[i] === v)
  ) {
    format = "PNG";
    let p = 8,
      chunks = 0,
      ihdr = false,
      idat = false,
      end = false;
    while (p < a.length) {
      if (++chunks > 512 || p + 12 > a.length) throw Error("PNG块结构不完整。");
      const n = d.getUint32(p),
        type = String.fromCharCode(...a.slice(p + 4, p + 8));
      if (n > a.length - p - 12) throw Error("PNG块长度异常。");
      if (type === "acTL") throw Error("暂不接动画PNG。");
      if (!ihdr && type !== "IHDR") throw Error("PNG缺少首部。");
      if (type === "IHDR") {
        if (ihdr || n !== 13) throw Error("PNG首部异常。");
        ihdr = true;
        width = d.getUint32(p + 8);
        height = d.getUint32(p + 12);
        bound();
      }
      if (type === "IDAT") idat = true;
      p += n + 12;
      if (type === "IEND") {
        if (n !== 0 || p !== a.length) throw Error("PNG结尾异常。");
        end = true;
        break;
      }
    }
    if (!ihdr || !idat || !end) throw Error("PNG不完整。");
  } else if (a.length > 4 && a[0] === 255 && a[1] === 216) {
    format = "JPEG";
    let p = 2,
      segments = 0,
      sos = false;
    while (p < a.length) {
      if (++segments > 512 || a[p++] !== 255) throw Error("JPEG段结构异常。");
      let pads = 0;
      while (a[p] === 255) {
        p++;
        if (++pads > 16) throw Error("JPEG填充异常。");
      }
      const m = a[p++];
      if (
        m === 0 ||
        m === 216 ||
        m === 217 ||
        m === 1 ||
        (m >= 208 && m <= 215) ||
        p + 2 > a.length
      )
        throw Error("JPEG首部异常。");
      const n = d.getUint16(p);
      if (n < 2 || p + n > a.length) throw Error("JPEG段长度异常。");
      if (m === 192 || m === 194) {
        if (width || n < 8 || a[p + 2] !== 8) throw Error("JPEG尺寸首部异常。");
        height = d.getUint16(p + 3);
        width = d.getUint16(p + 5);
        bound();
      } else if (m >= 192 && m <= 207 && ![196, 200, 204].includes(m))
        throw Error("暂只接常用8位JPEG。");
      if (m === 218) {
        sos = true;
        break;
      }
      p += n;
    }
    if (
      !width ||
      !height ||
      !sos ||
      a[a.length - 2] !== 255 ||
      a[a.length - 1] !== 217
    )
      throw Error("JPEG缺少尺寸或结尾。");
  } else throw Error("仅接静态PNG或JPEG，不能使用SVG/GIF/WebP。");
  return { width, height, format };
}
let decoding = false,
  encoding = false;
export const nativeBusy = () => decoding || encoding;
export function bitmap(file: Blob) {
  let cancel: () => void = () => {};
  const promise = new Promise<ImageBitmap>((resolve, reject) => {
    if (decoding) {
      reject(Error("上次图片解码还未结束，请稍后重试。"));
      return;
    }
    decoding = true;
    let visible = true;
    const timer = setTimeout(() => {
      if (visible) {
        visible = false;
        reject(Error("图片解码超过8秒，已放弃结果。"));
      }
    }, 8000);
    cancel = () => {
      if (visible) {
        visible = false;
        clearTimeout(timer);
        reject(Error("已取消。"));
      }
    };
    try {
      createImageBitmap(file).then(
        (b) => {
          decoding = false;
          clearTimeout(timer);
          if (!visible) {
            b.close();
            return;
          }
          visible = false;
          resolve(b);
        },
        () => {
          decoding = false;
          clearTimeout(timer);
          if (visible) {
            visible = false;
            reject(Error("图片无法解码，请更换文件。"));
          }
        },
      );
    } catch {
      decoding = false;
      clearTimeout(timer);
      visible = false;
      reject(Error("此浏览器不能解码图片。"));
    }
  });
  return { promise, cancel };
}
export function png(canvas: HTMLCanvasElement) {
  let cancel: () => void = () => {};
  const promise = new Promise<Blob>((resolve, reject) => {
    if (encoding) {
      reject(Error("上次图片编码还未结束，请稍后重试。"));
      return;
    }
    encoding = true;
    let visible = true;
    const timer = setTimeout(() => {
      if (visible) {
        visible = false;
        reject(Error("图片编码超过8秒，已放弃结果；原生编码不能强制中止。"));
      }
    }, 8000);
    cancel = () => {
      if (visible) {
        visible = false;
        clearTimeout(timer);
        reject(Error("已取消。"));
      }
    };
    try {
      canvas.toBlob((b) => {
        encoding = false;
        clearTimeout(timer);
        if (!visible) return;
        visible = false;
        b ? resolve(b) : reject(Error("PNG编码失败，请重试。"));
      }, "image/png");
    } catch {
      encoding = false;
      clearTimeout(timer);
      visible = false;
      reject(Error("PNG编码失败，请重试。"));
    }
  });
  return { promise, cancel };
}
