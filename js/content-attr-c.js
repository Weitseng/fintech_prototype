/* ============================================================
   內容層／負責人 C：屬性 C「保本安穩型」→ 推薦美元定存
   只需要提供這個屬性的商品家族描述（PRODUCT_DATA.deposit）與推薦卡片資料（RECO_CARD.deposit）；
   實際可選的天期／利率商品（7天／1個月／6個月／9個月／12個月）放在 catalog.js 的 CATALOG（cat:'deposit'），
   跟債券／基金一樣走橫向商品卡片列（見 flow.js stageGList／stageH3List）。
   注意：這裡的 PRODUCT_DATA.deposit.rate 只是家族描述用，不是比較基準利率——
   債券／基金／外匯定存的試算卡（card/calculator 元件）都固定用「活存」2.5% 做對照基準，兩者互不影響。
   提問、試算、清單、CTA 等流程一律共用 engine.js／flow.js，不要在這裡重寫或另刻樣式。
   ============================================================ */
PRODUCT_DATA.deposit={key:'deposit',name:'美元定存',tag:'定存',rate:0.0365,color:'#8b93a1',colorDark:'#6b7280'};

/* card/recommendation（js/component-library.js，交接文件：kgi-recommendation-card-handoff.md）
   取代原本 RECO_REASON.deposit 那段標題＋條列文字。type 用 'fx'（對應交接文件的美金定存配色
   modifier .kgi-card--fx），不是 'deposit'——卡片的配色 modifier 命名跟 PRODUCT_DATA／
   RECO_CARD 的 key 是兩套獨立的命名，卡片元件那邊統一沿用交接文件原本的 bond/fund/fx。 */
RECO_CARD.deposit={type:'fx',name:'美金定存',title:'領息穩定，天期靈活',subtitle:'適合求穩不想波動、想比台幣多賺息的資金',
  features:['利率通常高於台幣定存','本金與利息明確','天期彈性，短至數天、長至一年','美元計價，兼顧資產配置']};
