/* ============================================================
   內容層／負責人 B：屬性 B「穩健收息型」→ 推薦債券
   只需要提供這個屬性的商品資料（PRODUCT_DATA.bond）與推薦卡片資料（RECO_CARD.bond）。
   提問、試算、清單、CTA 等流程一律共用 engine.js／flow.js，不要在這裡重寫或另刻樣式。
   ============================================================ */
/* name/tag 用於屬性層級的訊息（推薦理由、按鈕文案）；實際可選的債券商品清單改由 catalog.js 的 CATALOG 提供 */
PRODUCT_DATA.bond={key:'bond',name:'凱基優選投資級債券',tag:'債券',rate:0.045,color:'#3355FF',colorDark:'#1f3ad6'};

/* card/recommendation（js/component-library.js，交接文件：kgi-recommendation-card-handoff.md）
   取代原本 RECO_REASON.bond 那段標題＋條列文字，同時也是 combo（債券＋基金搭配）情境下
   兩張卡片之一（見 js/flow.js stageE()：S.recoType==='combo' 時會直接引用這裡的資料，
   不另外複製一份）。 */
RECO_CARD.bond={type:'bond',name:'債券',title:'穩定現金流，固定收益之選',subtitle:'適合中長期暫不動用、想穩定領息的資金',
  features:['利息收入','提供穩定現金流','投資級債波動低於股票','持有到期未違約可領回面額']};
