# Radius 圓角規範

## 用途說明
定義介面元件的圓角大小，共 5 級，從無圓角到全圓角（膠囊形）。

## Token 對照表

| Token 名稱（建議） | 數值 | 用途 | CSS 變數 | Figma 變數 |
|---|---|---|---|---|
| radius-none | 0px | 直角，無圓角 | `--radius-none` | `0` |
| radius-xs | 1px | 小版 Tag | `--radius-xs` | `1` |
| radius-small | 3px | Selection Chip | `--radius-small` | `3` |
| radius-medium | 6px | 卡片 | `--radius-medium` | `6` |
| radius-full | 100px | 囊型狀按鈕／選擇器／Tag、Search Bar（膠囊形） | `--radius-full` | `100` |

## 使用情境 Do & Don't
- Do：卡片一律使用 `radius-medium`（6px），維持跨頁面一致的視覺重量。
- Do：需要膠囊外形的按鈕、Search Bar、選擇器統一用 `radius-full`。
- Don't：不要為卡片挑選 1px 或 3px 等其他數值，會造成元件識別不一致。
- Don't：不要在同一元件家族內混用多種 radius token，若現有畫面中出現不一致，請提出讓設計負責人統一裁定。

## 開發對應
前端可直接引用 `radius-tokens.css`（CSS variables）或 `_radius-tokens.scss`（SCSS）中定義的 token，不需硬編數值。

