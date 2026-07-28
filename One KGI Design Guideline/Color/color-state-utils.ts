/**
 * MDS_Foundation — Color State Utilities
 * -----------------------------------------------------------------------
 * 依 KGI Design Guideline 實作兩種互動色狀態：
 *
 * 1. Hover：不額外定義色票，改由容器色 / 文字色的原始色值，
 *    以 HSB 色彩空間調整 Brightness (亮度) 自動推算：
 *      - 原始 Brightness ≤ 32%        → Brightness + 10%
 *      - 33% ≤ 原始 Brightness ≤ 86%  → Brightness - 10%
 *      - 原始 Brightness ≥ 87%        → Brightness − 5%
 *    （前兩條規則實際結果相同，可合併為「< 87% 一律 +10%，否則 −5%」）
 *
 * 2. Disabled：不做運算，統一改用固定的語意化 token
 *      - 容器色 → Surface/Disabled
 *      - 文字色 → Content/Disabled
 *
 * 使用時機建議：
 * - Hover 色因為是「運算結果」，建議在 build time（例如 Style Dictionary
 *   transform、或元件庫的 CSS-in-JS 產出階段）先算好，寫死成
 *   `--color-xxx-hover` 變數，避免每次互動都在瀏覽器裡即時運算。
 * - 若元件庫是 runtime 動態換色（如可自訂主題色的系統），才在
 *   runtime 呼叫 getHoverColor()。
 * - Disabled 色不需要運算，直接在 CSS / 元件層 swap token 即可，
 *   不需要呼叫任何函式。
 * -----------------------------------------------------------------------
 */

// ---------- 型別 ----------
interface HSB {
  h: number; // 0-360
  s: number; // 0-100
  b: number; // 0-100 (Brightness / Value)
}

// ---------- HEX <-> HSB 轉換 ----------

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const bigint = parseInt(
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean,
    16
  );
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHsb(r: number, g: number, b: number): HSB {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rr) h = ((gg - bb) / delta) % 6;
    else if (max === gg) h = (bb - rr) / delta + 2;
    else h = (rr - gg) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : (delta / max) * 100;
  const brightness = max * 100;

  return { h, s, b: brightness };
}

function hsbToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const ss = s / 100;
  const vv = v / 100;
  const c = vv * ss;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vv - c;

  let rr = 0, gg = 0, bb = 0;
  if (h < 60) [rr, gg, bb] = [c, x, 0];
  else if (h < 120) [rr, gg, bb] = [x, c, 0];
  else if (h < 180) [rr, gg, bb] = [0, c, x];
  else if (h < 240) [rr, gg, bb] = [0, x, c];
  else if (h < 300) [rr, gg, bb] = [x, 0, c];
  else [rr, gg, bb] = [c, 0, x];

  return {
    r: Math.round((rr + m) * 255),
    g: Math.round((gg + m) * 255),
    b: Math.round((bb + m) * 255),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// ---------- Hover 規則 ----------

/**
 * 依 MDS Hover 規則調整 Brightness：
 * - Brightness >= 87 → -5%
 * - 其他（含 <=32 與 33-86）→ +10%
 * 結果 clamp 在 0-100 之間。
 */
function adjustHoverBrightness(brightness: number): number {
  const delta = brightness >= 87 ? -5 : 10;
  return Math.max(0, Math.min(100, brightness + delta));
}

/**
 * 輸入任一容器色或文字色的 HEX，回傳對應的 Hover HEX。
 * 只調整 Brightness，Hue / Saturation 保持不變。
 */
export function getHoverColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const hsb = rgbToHsb(r, g, b);
  const newBrightness = adjustHoverBrightness(hsb.b);
  const { r: nr, g: ng, b: nb } = hsbToRgb(hsb.h, hsb.s, newBrightness);
  return rgbToHex(nr, ng, nb);
}

// ---------- Disabled 規則 ----------

/**
 * Disabled 不做運算，統一 swap 成固定語意化 token。
 * 實際色值由 Surface/Disabled、Content/Disabled 兩個 design token 決定，
 * 這裡只回傳 token 名稱，實際色碼交由 CSS variable / Design Token 系統解析。
 */
export const disabledTokens = {
  // 註：實際 Figma 檔案裡沒有獨立的 "Surface/Disabled" 變數，
  // 容器 disabled 色是定義在 Container/General/Disabled。
  container: "var(--color-container-general-disabled)", // 對應 Figma: Container/General/Disabled
  text: "var(--color-content-general-disabled)",         // 對應 Figma: Content/General/Disabled
} as const;

// ---------- 使用範例 ----------
//
// // Hover（建議 build time 產出，或元件動態算色時 runtime 呼叫）
// const primaryDefault = "#0047AB";
// const primaryHover = getHoverColor(primaryDefault); // -> 自動依規則算出
//
// // Disabled（直接 swap token，不需運算）
// button.style.backgroundColor = disabledTokens.container;
// button.style.color = disabledTokens.text;
