# KGI Typography Guideline 字型規範

對應程式化 token 檔案:`kgi-typography-tokens.css`(標準 / 加大字級,適用整體 KGI 字級系統)、`kgib-typography-tokens.css`(KGIB 群組,僅限用於凱基銀行,為獨立使用的字級規範,不與主檔案比較或搭配使用)。

## 0. 命名規則 Naming Convention

所有字級 token 統一採用:

```
--kgi-font-{platform}-{level}-{lang}-{property}
```

- **platform**:`web` | `mweb` | `ios` | `auto`
  - `web` / `mweb` / `ios` 對應 Figma 的三個平台分類。
  - `auto`:僅 Web 開發頁面使用,依「4. 字型轉換的 Breakpoint 判斷」自動切換 `web`/`mweb` 數值,不需手動判斷平台(見該章節)。iOS / Android 原生開發沒有 `auto`,直接讀取對應平台數值。
- **level**:`display-l` | `display-m` | `display-s` | `headline` | `title` | `subtitle-bold` | `subtitle-regular` | `body-bold` | `body-regular` | `caption-regular`,對應「1. 字型層級」的十個角色。
- **lang**:`tc` | `en`。
- **property**:`family` | `size` | `size-rem` | `weight` | `line-height` | `letter-spacing`。
  - `size-rem` 只存在於 `web` / `mweb`,依「2. 單位與換算規範」換算(1rem = 16px);`ios` 不提供。
  - `weight` 採用各平台字體「自己」的原始數值(取自 Figma 變數,而非 Tokens Plugin 匯出後四捨五入的數字)。例如 iOS SF Pro 的 Light/Medium 原始數值為 274 / 510,PingFang TC / Noto Sans TC / Montserrat 則是常見的 300 / 400 / 500 / 600,因為每種字體對應的字重刻度不同,不做跨平台標準化。

範例:`--kgi-font-web-headline-tc-size-rem` = Web 平台、Headline 層級、繁中、rem 單位的字級大小。

加大字級(KGI-大字級)沿用同一套變數名稱,透過在 `<html>` 或最外層容器加上 `data-kgi-text-scale="large"` 屬性覆寫數值,不需要改變元件的 class 或變數命名。

## 1. 字型層級 Typography Level

### 功能 level

| 層級 | 說明 |
| --- | --- |
| Display - L | 第一級,用於需要吸引注意力的短語、說明或有具有影響力的短內容。 |
| Display - M | 第二級,用於需要吸引注意力的短語、說明或有具有影響力的短內容。 |
| Display - S | 第三級,用於需要吸引注意力的短語、說明或有具有影響力的短內容。 |
| Headline | 第一級,用於需要吸引注意的並清楚展示的標題,通常出現在頁面的主標。 |
| Title | 第二級,用於需要吸引注意的並清楚展示的標題,通常出現在區塊的標題。 |
| Subtitle - B | 一級區塊主題,呈現重要信息,用於一般卡片的標題。 |
| Subtitle - R | 次級區塊主題,用於小組件集合的標題,如 list 集合的標題。 |
| Body - B | 內文重點文字。 |
| Body - R | 內文,是最常見的字體大小,用於大多數內文和小組件。如 input、Tab、Progress indicator。 |
| Caption - R | 備註文字,最小的文字,用於輔助性的說明,在組件上用於輸入欄位下方的說明文字。 |

對應 CSS token 的 `{level}` slug:`display-l`、`display-m`、`display-s`、`headline`、`title`、`subtitle-bold`、`subtitle-regular`、`body-bold`、`body-regular`、`caption-regular`。

### 字型運用原則

- **通則**:不同裝置之同一文字類別需使用對應字型,例如在 Desktop 使用 Headline,則 Mobile 對應之文字也需使用 Headline。
- **特殊情況**:若因裝置縮小而產生同類文字過大導致閱讀體驗不佳時,可以於手機版調整其他適合的文字類型。例如總覽金額的表現型數字,於桌機版螢幕有足夠空間時,可透過較大字型來凸顯資訊層級,然手機螢幕寬度有限,若使用過大字型會影響體驗,則可在手機版調整使用適合的其他字型,此時則無須與桌機裝置應用同字型。

## 2. 單位與換算規範 Unit & Conversion

為提升產品的無障礙體驗(Accessibility)與響應式彈性,「網頁端開發」優先採用 `rem` 單位,而非固定像素 `px`。

**換算基準 (Root Reference)**
- 基準值:`1rem = 16px`。
- 設定原理:採用瀏覽器全球標準預設值 16px 作為根節點 (Root) 基準,確保使用者調整瀏覽器字體大小時,介面能等比例自適應縮放。

**在 token 檔案中的對應**:Web / mWeb 平台的每個字級同時提供 `--kgi-font-{platform}-{level}-{lang}-size`(px)與 `--kgi-font-{platform}-{level}-{lang}-size-rem`(rem,依 1rem=16px 換算)兩種寫法,依專案慣例擇一使用即可。iOS 為原生開發平台,不適用 rem,僅提供 px(pt)數值。

## 3. 字體 Font Family

| 平台 | 中文字型 | 英文/數字字型 |
| --- | --- | --- |
| 網頁字型 (Web,含 mWeb) | 思源黑體 / 思源黑体(Noto Sans TC / Noto Sans SC) | Montserrat |
| iOS 字型 (Native App) | 蘋方 / 苹方(PingFang TC / PingFang SC) | SF Pro |
| Android 字型 (Native App) | 思源黑體 / 思源黑体(Noto Sans TC / Noto Sans SC) | Roboto |

**判斷原則**:是 Web 網頁開發(不論桌機或 mWeb),一律用 Noto Sans TC / Montserrat;是 Native App 開發,則依平台分別套用 iOS(PingFang TC / SF Pro)或 Android(思源黑體 / Roboto)對應的字體。

## 4. 字型轉換的 Breakpoint 判斷

| 平台 | 判斷條件 |
| --- | --- |
| Web desktop | Width > 768 |
| Mobile web | Width <= 768 |

此 Breakpoint 判斷只適用於 **Web 網頁開發的頁面**(桌機版與 mWeb);Native App(iOS / Android)不適用這組規範,原生開發不需要、也不會依這個寬度條件切換字級。

**於 `kgi-typography-tokens.css` 中的實作**:提供 `--kgi-font-auto-{level}-{lang}-{property}` 這組 token,預設(> 768px)指向 Web 數值,並透過 `@media (max-width: 768px)` 覆寫為 mWeb 數值,Web 頁面的元件套用 `auto` token 即可自動依螢幕寬度切換,不需手動判斷平台。iOS(以及未來如有 Android)為原生 App,無對應的 `auto` token,也不套用此 Breakpoint 規範,直接依原生開發規範讀取對應平台的數值即可。
