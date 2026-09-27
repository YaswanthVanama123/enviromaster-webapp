export interface TrimOptions {
  alphaThreshold?: number;
  lumaThreshold?: number;
  padding?: number;
}

function toCanvas(source: HTMLCanvasElement | HTMLImageElement): HTMLCanvasElement | null {
  if (source instanceof HTMLCanvasElement) return source;

  const canvas = document.createElement("canvas");
  canvas.width = source.naturalWidth || source.width;
  canvas.height = source.naturalHeight || source.height;
  if (canvas.width === 0 || canvas.height === 0) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0);
  return canvas;
}

export function removeLightBackground(canvas: HTMLCanvasElement, lumaThreshold = 232): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (luma >= lumaThreshold) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(image, 0, 0);
}

export function trimSignature(
  source: HTMLCanvasElement | HTMLImageElement,
  options: TrimOptions = {}
): string | null {
  const { alphaThreshold = 12, padding = 6 } = options;

  const canvas = toCanvas(source);
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const { width, height } = canvas;
  if (width === 0 || height === 0) return null;

  const data = ctx.getImageData(0, 0, width, height).data;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0 || maxY < 0) return null;

  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;

  const output = document.createElement("canvas");
  output.width = cropWidth;
  output.height = cropHeight;
  const outputCtx = output.getContext("2d");
  if (!outputCtx) return null;

  outputCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return output.toDataURL("image/png");
}

export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("That file is not a readable image"));
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function prepareUploadedSignature(file: File): Promise<string> {
  const image = await loadImageFile(file);
  const canvas = toCanvas(image);
  if (!canvas) throw new Error("That image could not be processed");

  removeLightBackground(canvas);
  const trimmed = trimSignature(canvas);
  if (!trimmed) throw new Error("No signature could be found in that image");
  return trimmed;
}

const TYPED_RENDER_SIZE = 96;

export function renderTypedSignature(text: string, fontFamily: string): string | null {
  const value = text.trim();
  if (!value) return null;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const font = `${TYPED_RENDER_SIZE}px ${fontFamily}`;
  ctx.font = font;
  const metrics = ctx.measureText(value);
  const width = Math.ceil(metrics.width + TYPED_RENDER_SIZE);
  const height = Math.ceil(TYPED_RENDER_SIZE * 2.2);

  canvas.width = width;
  canvas.height = height;

  const drawCtx = canvas.getContext("2d");
  if (!drawCtx) return null;

  drawCtx.clearRect(0, 0, width, height);
  drawCtx.font = font;
  drawCtx.fillStyle = "#0d1c6b";
  drawCtx.textAlign = "left";
  drawCtx.textBaseline = "alphabetic";
  drawCtx.fillText(value, TYPED_RENDER_SIZE / 2, height * 0.62);

  return trimSignature(canvas, { padding: 2 });
}
