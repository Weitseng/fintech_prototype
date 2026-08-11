/* ============================================================
   內容層／負責人 A：屬性 A「成長潛力型」→ 推薦基金
   只需要提供這個屬性的商品資料（PRODUCT_DATA.fund）與推薦卡片資料（RECO_CARD.fund）。
   提問、試算、清單、CTA 等流程一律共用 engine.js／flow.js，不要在這裡重寫或另刻樣式。
   ============================================================ */
/* name/tag 用於屬性層級的訊息（推薦理由、按鈕文案）；實際可選的基金商品清單改由 catalog.js 的 CATALOG 提供 */
PRODUCT_DATA.fund={key:'fund',name:'凱基核心成長基金組合',tag:'基金',rate:0.06,color:'#7A4FE0',colorDark:'#5c34c2'};

/* card/recommendation（js/component-library.js，交接文件：kgi-recommendation-card-handoff.md）
   取代原本 RECO_REASON.fund 那段標題＋條列文字：type 決定卡片配色 modifier（.kgi-card--fund），
   features 建議維持 3–4 條、每條盡量一句話講完，不要又寫成長段落——卡片本身已經有標題／
   副標／清單三層視覺區分，不需要在 features 文字裡再重複「基金可能適合您」這種鋪陳句。 */
RECO_CARD.fund={type:'fund',name:'基金',title:'多種組合，一次分散布局',subtitle:'適合想參與市場成長、進出保有彈性的資金',
  features:['專業經理人操盤選股','一次投資即分散多檔標的','門檻低、可定期定額','流動性佳、可隨時申贖']};
