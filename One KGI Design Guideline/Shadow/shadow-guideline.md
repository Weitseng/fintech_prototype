# Shadow 陰影規範

## 1. 設計原則

**核心原則：陰影大小反映高度（Elevation）。**

表面越高，陰影的模糊範圍（Blur Radius）、垂直位移（Offset Y）與深度（不透明度）越大、越明顯；表面越低，陰影越小、越貼近物件本身。透過這樣的遞增關係，畫面中的層次一目瞭然，使用者能直覺判斷哪個元件「浮」在最上層、哪個屬於基礎內容層，藉此建立清楚且一致的視覺層級系統。

現有三階陰影（Light／Basic／PopOver）數值本身已依此原則遞增設計，如下表所示，數值由淺至深、由小至大對應由低至高的層級：

| Token | Elevation 定位 | Blur Radius | Offset Y | Spread | 不透明度 (Alpha) | 色彩基準 |
|---|---|---|---|---|---|---|
| light | 最低層級 | 8px | 1px | 0 | ≈ 2% | #0044AD |
| basic | 基礎層級 | 12px | 2px | 0 | ≈ 4% | #0044AD |
| popover | 最高層級 | 16px | 4px | 0 | ≈ 8% | #0044AD |

> 註：Blur Radius、Offset Y、不透明度三者隨層級同步遞增，精確落實「越高的表面陰影越大」的規則；色彩基準統一採用品牌藍 #0044AD，僅透明度隨層級提高。

### 2 陰影與底色搭配原則

依 Color Guideline，介面常用背景色為 **Surface White** 與 **Surface Blue**。陰影層級的選用進一步對應底色而定：

- 底色為 **Surface White** 時，疊在上方的物件使用 **PopOver** 陰影。
- 底色為 **Surface Blue** 時，疊在上方的物件使用 **Basic** 陰影。

這項原則說明了第 3 節中 Basic／PopOver 分類背後的實際邏輯：兩者都是「疊在底色之上、需要與底色做視覺分離」的物件，實際採用哪一階陰影，取決於元件所疊加的底色，而不只是元件類型。

> 註：Surface White／Surface Blue 的實際色彩數值請以 Color Guideline 為準；本節僅定義陰影層級與底色的搭配邏輯。

## 3. 各陰影適用情境 Usage Guide

金融科技介面設計趨勢朝向資料優先（data-first）、降低視覺雜訊，以及行動端以底部操作與手勢為主的方向發展，陰影的使用建議更聚焦在「輔助使用者判斷操作層級」，而非單純作為裝飾。更新方向如下：

- **降低非必要陰影**：容器類元件（如未選取狀態）優先考慮以邊框取代最低層級陰影，讓畫面更輕盈、聚焦於資料與操作本身。
- **保留關鍵層級陰影**：浮動、暫時性、需要使用者聚焦處理的元件（Dialog、Dropdown、Chatbot 等）仍保留明顯陰影，強化其可操作性與信任感，尤其在金融類介面中，清楚的層級是建立使用者信任的重要一環。
- **因應行動優先體驗**：Bottom Sheet、Snackbar／Toast 等行動端常見的浮動元件已納入 PopOver 層級，對應其實際的浮動與互動特性。

| Type | 使用時機 | 使用情境（依分類） |
|---|---|---|
| **Light**<br>最低層級 | 僅用於與背景做極輕微的區隔，元件本身不需要額外的操作強調，例如尚未被選取、已停用的狀態。因應扁平化、資料優先的趨勢，建議優先以邊框取代，僅在確實需要時才使用陰影。 | **狀態類**：Unselected currency selector、Unselected bank card、Disabled 狀態卡片 |
| **Basic**<br>基礎層級 | 用於承載獨立資訊的內容容器，是介面中最常用的層級，建立內容區塊與背景之間的基礎分離。常見疊加底色為 Surface Blue（見 2 節）。 | **內容容器**：Card、List、Sheet、Banner、Bottom Sheet 容器<br>**導覽／列表元件**：Navi Bar、Table Row（Hover 狀態）<br>**互動狀態**：Selected currency selector |
| **PopOver**<br>最高層級 | 用於暫時浮現於介面之上、需要使用者聚焦處理的元件。陰影需明顯，以強化「浮空」層次與可互動性，是建立操作焦點與信任感的重要視覺線索。常見疊加底色為 Surface White（見 2 節）。 | **對話／選單類**：Dialog、Dropdown、Chatbot、Tooltip<br>**導覽／版面類**：Top & bottom navigation、Half screen modal、Bottom Sheet Overlay<br>**浮動操作類**：Floating bottom、Floating Button、FAB<br>**即時通知類**：Snackbar／Toast |

