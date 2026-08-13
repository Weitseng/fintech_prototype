/* ============================================================
   商品資料（共用，來源：精選債券基金_客戶屬性對照矩陣.xlsx，2026.06）
   異動請對照原始 Excel「商品對照矩陣」工作表一起更新，欄位定義見該檔「篩選說明」工作表。
   - rate／rate1y：以票面利率（債券）表示，或基金的 Excel「近一年報酬率」（真實數字），
     供試算卡（card/calculator）使用；基金的 rate1y 數值上等於 return1y，兩個欄位都留著
     是因為 card/calculator 統一讀 rate1y（跨債券/基金/定存共用同一套欄位名稱），
     card/product 統一讀 return1y，兩邊呼叫端不用各自判斷商品類別去挑欄位名稱
   - rate3y：近三年參考年化值。債券票面利率固定，1年/3年數字相同；基金原本這裡放的是
     示範性參考值，2026-07-30 依 Excel「近三年報酬率」欄位改回真實數字——但 Excel 那欄
     揭露的是「三年累積報酬率」，不是年化值，而試算卡的公式是「年化率 × 持有年數」的單利
     模式（見 renderAssetVsDepositCalc() 的 weighted 計算），兩者單位不同，直接套用會在
     乘上 3 年時重複計入時間效果、把報酬率灌水成三倍。這裡先除以 3 換算成試算卡單利公式
     需要的「等效年化」數字（例如 Excel 累積 48.9% → 16.3%），數學上等於「假設三年平均
     分攤」的近似值，不是官方年化報酬率，之後若基金公司揭露正式年化數字，這裡要優先換成
     那個數字，除以 3 只是在沒有官方年化數字時的近似做法
   - return1y：僅 fund 商品使用，Excel「近一年報酬率」原始欄位（真實數字），
     商品卡片（card/product）的「近一年報酬率」統計格顯示這個
   - nav：僅 fund 商品使用，Excel「基金淨值」原始欄位，商品卡片顯示用
   - refPrice：僅 bond 商品使用，Excel「參考買進價」原始欄位，商品卡片顯示用；
     債券的「票面/配息率」商品卡片沿用既有的 rate／rate1y 即可——這兩個欄位對債券來說本來就是
     Excel 的真實票面利率，不是示範值，不用另外新增欄位
   - risk：穩健／中等／積極（風險接受度，稻越高風險越大）
   - cat：bond／fund／deposit（deposit 為屬性 C 的美元定存天期商品，rate 為銀行公告牌告利率，非試算示範值）
   - investType：['收益'|'平衡'|'成長']，可複選
   - assetSize：小／中／大（對應最低申購門檻的資產規模建議）——判斷時要看 minAmt 換算回同一計價幣（如美元）後的
     實際等值金額，不能只看 minAmt 的數字大小：例如 BD395 面額 200,000 但計價幣是南非幣（ZAR），實際等值僅約
     11,000 美元，跟其他標「中」的美元 10,000 面額債券是同一量級，不能因為數字上「20萬」看起來比「1萬」大就標「大」
   - tenor：僅 deposit 商品使用，顯示用的天期文字（如「7天」「12個月」）
   ============================================================ */
/* 債券商品卡片（card/product）兩個統計格的標題，直接取自 Excel「商品對照矩陣」工作表的
   欄位標題儲存格 H2（票面/配息率）／J2（參考買進價(%)），不要在 component-library.js 裡另外
   寫死字串——之後 Excel 欄位標題如果改名，只要同步改這裡兩個值即可，不用去 render 函式裡找。
   J2 標題本身帶了「(%)」，代表 refPrice 是「面額的百分之幾」的報價慣例（如 94 代表面額的
   94%），不是絕對金額——儲存格數字本身是整數 94、沒有存成 0.94，顯示時要自己補上 % 後綴，
   不能像 rate1y／return1y 那樣先乘以 100（那樣會變成 9400%，是錯的）。 */
const BOND_CARD_LABELS={rate:'票面/配息率',price:'參考買進價(%)'};
const CATALOG=[
  {code:'BD337',cat:'bond',name:'美林 Merrill Lynch BV',currency:'AUD',rate:0.051,rate1y:0.051,rate3y:0.051,refPrice:94,
    payFreq:'月配',minAmt:'10,000',maturity:'2044/2/1',callDate:'2029/2/1',
    /* assetSize 原標'中'：AUD 10,000 換算實際等值約 6,500 美元，比其他標'中'的美元 10,000 面額債券
       低、更接近標'小'的 BD348（USD 5,000），故改標'小' */
    risk:'穩健',investType:['收益'],assetSize:'小',entry:'單筆',
    feature:'月月配息；高信評 AA-（本表信評最高）；澳幣匯率風險',
    issuerInfo:'美國銀行（Bank of America）集團旗下設於荷蘭的融資發行體，Merrill Lynch 為其投行與財富管理品牌，所發債券的信用實質反映母集團美國銀行。美銀為美國規模最大的金融控股集團之一。'},
  {code:'BD395',cat:'bond',name:'摩根士丹利金融',currency:'ZAR',rate:0.066,rate1y:0.066,rate3y:0.066,refPrice:82,
    payFreq:'季配',minAmt:'200,000',maturity:'2040/10/23',callDate:'-',
    risk:'積極',investType:['收益','成長'],assetSize:'中',entry:'單筆',
    feature:'到期贖回價 150%；持有期領息 6.6%；南非幣結構型，匯率風險最高（面額雖為 20萬，但以南非幣計價，實際門檻與其他債券相近）',
    issuerInfo:'摩根士丹利集團的融資子公司，發行債券通常由母公司 Morgan Stanley 提供保證。摩根士丹利是全球主要的投資銀行與財富管理機構之一。'},
  {code:'BD396',cat:'bond',name:'Alphabet 公司',currency:'USD',rate:0.055,rate1y:0.055,rate3y:0.055,refPrice:92,
    payFreq:'半年配',minAmt:'10,000',maturity:'2046/2/15',callDate:'2045/8/15',
    risk:'穩健',investType:['收益'],assetSize:'中',entry:'單筆',
    feature:'Google／YouTube 母公司；投資級科技龍頭；新發行票面 5%以上',
    issuerInfo:'Google 的母公司，全球最大科技公司之一。核心業務為網路搜尋與數位廣告，並涵蓋 YouTube、Android、Google Cloud 與人工智慧等，財務體質穩健、信用評等居最高等級之列。'},
  {code:'BD365',cat:'bond',name:'康卡斯特 Comcast',currency:'USD',rate:0.0565,rate1y:0.0565,rate3y:0.0565,refPrice:91,
    payFreq:'半年配',minAmt:'10,000',maturity:'2054/6/1',callDate:'2053/12/1',
    risk:'穩健',investType:['收益'],assetSize:'中',entry:'單筆',
    feature:'美國第一大有線電視；環球影業（Universal）母公司；長天期',
    issuerInfo:'美國最大的有線寬頻與媒體集團之一，旗下包含 NBCUniversal（影視、環球影城）與歐洲 Sky，業務橫跨寬頻網路、有線電視、影視內容與主題樂園。'},
  {code:'BD398',cat:'bond',name:'Meta 平台公司',currency:'USD',rate:0.063,rate1y:0.063,rate3y:0.063,refPrice:93,
    payFreq:'半年配',minAmt:'10,000',maturity:'2056/5/15',callDate:'2055/11/15',
    risk:'穩健',investType:['收益'],assetSize:'中',entry:'單筆',
    feature:'全球社群平台龍頭；美元券票面最高 6%以上；天期長',
    issuerInfo:'Facebook、Instagram、WhatsApp、Threads 的母公司，全球社群媒體與數位廣告龍頭，近年大幅投資人工智慧與 Reality Labs（VR/AR、元宇宙）。'},
  {code:'BD348',cat:'bond',name:'高盛金融國際',currency:'USD',rate:0.045,rate1y:0.045,rate3y:0.045,refPrice:86,
    payFreq:'月配',minAmt:'5,000',maturity:'2039/9/5',callDate:'2026/9/5',
    risk:'穩健',investType:['收益'],assetSize:'小',entry:'單筆',
    feature:'月月配息；門檻最低 USD 5,000；中長天期；首次贖回日近（2026/9/5），易被提前贖回',
    issuerInfo:'高盛集團旗下的國際發行／營運實體，所發債券通常由母公司 The Goldman Sachs Group 保證。高盛是全球頂尖的投資銀行之一。'},
  {code:'FUND1',cat:'fund',name:'貝萊德全球智慧數據股票入息基金',currency:'USD',rate:0.08,rate1y:0.1211,rate3y:0.163,nav:26.84,return1y:0.1211,
    payFreq:'月配',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'積極',investType:['收益','成長'],assetSize:'小',entry:'單筆／定期定額',
    feature:'AI 大數據量化選股；全球股票入息；持股 250–400 檔分散；配息可能來自本金',
    managerInfo:'貝萊德（BlackRock）發行，運用系統化／量化模型（即「智慧數據」）篩選全球股票，以追求較高股息收益為訴求，屬全球股票型。股票型波動相對較高，配息來源可能包含本金。'},
  {code:'FUND2',cat:'fund',name:'摩根多重收益基金',currency:'USD',rate:0.045,rate1y:0.1405,rate3y:0.1098,nav:74.36,return1y:0.1405,
    payFreq:'月配',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'中等',investType:['平衡','收益'],assetSize:'小',entry:'單筆／定期定額',
    feature:'全球多重資產（債＋股＋REITs）；月月配息；含高收益債，配息可能來自本金',
    managerInfo:'摩根資產管理旗下的多重資產（股、債等）收益型基金，全球分散布局，目標提供相對穩定的月配息。組合含非投資等級（高收益）債，配息來源可能為本金。'},
  {code:'FUND3',cat:'fund',name:'凱基收益成長多重資產基金',currency:'TWD',rate:0.05,rate1y:0.1509,rate3y:0.1473,nav:15.53,return1y:0.1509,
    payFreq:'月配',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'中等',investType:['平衡','成長'],assetSize:'小',entry:'單筆／定期定額',
    feature:'股債雙向＋掩護性買權收權利金；月配；含高收益債，配息可能來自本金',
    managerInfo:'凱基投信發行的海外多重資產型基金，股債靈活配置、兼顧收益與成長，提供月配息，風險報酬等級 RR3。含非投資等級債，配息來源可能為本金。'},
  {code:'FUND4',cat:'fund',name:'匯豐ESG永續多元資產組合基金',currency:'TWD',rate:0.035,rate1y:0.1321,rate3y:0.0835,nav:9.19,return1y:0.1321,
    payFreq:'月配',minAmt:'小額',maturity:'-',callDate:'-',
    /* risk 標'穩健'：雖然官方風險報酬等級跟 FUND3 同為 RR3，但兩者實際波動特性不同——FUND3 含非投資等級（高收益／垃圾）債
       且用掩護性買權疊加策略，波動較大，仍標'中等'；FUND4 是 FOF（投資其他基金再分散），債部位 50% 以上、
       自身文案已寫明「較保守」，波動特性明顯低於 FUND3，故不跟著同一個 RR3 標籤走、改標'穩健'。
       注意：目前 5 檔基金裡只有這一檔是'穩健'，數量仍未滿 matchCatalogAtLeast() 的 min=2 門檻，
       保守用戶走純基金路徑時仍會被放寬到全部 5 檔（見 stageGList()/stageH3List() 的放寬說明文案）——
       這是基金商品池目前只有 1 檔真正保守商品的資料現況，不是標籤錯誤，除非之後新增第 2 檔穩健基金才能真正解決 */
    risk:'穩健',investType:['平衡'],assetSize:'小',entry:'單筆／定期定額',
    feature:'ESG 永續主題；股債平衡、債部位 50% 以上；風險等級 RR3，較保守',
    managerInfo:'匯豐投信發行的組合型基金（投資其他基金的 FOF），投資於具 ESG／永續特色的子基金，跨股債多元資產配置，採月配息設計，透過子基金分散但仍受市場波動影響。'},
  {code:'FUND5',cat:'fund',name:'凱基台灣精五門基金',currency:'TWD',rate:0.09,rate1y:1.6084,rate3y:0.9547,nav:154.48,return1y:1.6084,
    payFreq:'不配息',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'積極',investType:['成長'],assetSize:'小',entry:'單筆／定期定額',
    feature:'台股五大趨勢產業；追求資本利得；RR4 股票型',
    managerInfo:'凱基投信的國內股票型基金，聚焦台灣股市精選標的（近期以半導體、電子等為主），追求資本利得、不配息，風險報酬等級 RR4；屬單一市場股票型，波動相對較高。'},
  /* 屬性 C（保本安穩型）推薦商品：美元定存，依天期分為 5 檔，供橫向商品卡片列選擇（見 content-attr-c.js）
     maxAmt（最高限額）原始資料是 2,000，比 minAmt（最低申購金額）3,000 還低，數字顛倒，暫時改成
     100,000 讓「最高限額 ≥ 最低申購金額」，這是合理猜測、不是官方數字，正式數字要跟業務端核對後更新 */
  {code:'FDUSD07D',cat:'deposit',name:'美元定存 7天',currency:'USD',rate:0.10,rate1y:0.10,rate3y:0.10,
    payFreq:'到期領息',minAmt:'3,000',maxAmt:'100,000',maturity:'-',callDate:'-',tenor:'7天',
    risk:'穩健',investType:['收益'],assetSize:'小',entry:'單筆',
    feature:'短天期資金靈活運用；本行存戶專屬；限行動銀行申辦；美元計價，需留意匯率風險'},
  {code:'FDUSD1M',cat:'deposit',name:'美元定存 1個月',currency:'USD',rate:0.045,rate1y:0.045,rate3y:0.045,
    payFreq:'到期領息',minAmt:'3,000',maxAmt:'100,000',maturity:'-',callDate:'-',tenor:'1個月',
    risk:'穩健',investType:['收益'],assetSize:'小',entry:'單筆',
    feature:'短期資金停泊首選；本行存戶專屬；限行動銀行申辦；美元計價，需留意匯率風險'},
  {code:'FDUSD6M',cat:'deposit',name:'美元定存 6個月',currency:'USD',rate:0.04,rate1y:0.04,rate3y:0.04,
    payFreq:'到期領息',minAmt:'3,000',maxAmt:'100,000',maturity:'-',callDate:'-',tenor:'6個月',
    risk:'穩健',investType:['收益'],assetSize:'小',entry:'單筆',
    feature:'半年期穩定收益；本行存戶專屬；限行動銀行申辦；美元計價，需留意匯率風險'},
  {code:'FDUSD9M',cat:'deposit',name:'美元定存 9個月',currency:'USD',rate:0.0385,rate1y:0.0385,rate3y:0.0385,
    payFreq:'到期領息',minAmt:'3,000',maxAmt:'100,000',maturity:'-',callDate:'-',tenor:'9個月',
    risk:'穩健',investType:['收益'],assetSize:'小',entry:'單筆',
    feature:'中期資金規劃；本行存戶專屬；限行動銀行申辦；美元計價，需留意匯率風險'},
  {code:'FDUSD12M',cat:'deposit',name:'美元定存 12個月',currency:'USD',rate:0.0365,rate1y:0.0365,rate3y:0.0365,
    payFreq:'到期領息',minAmt:'3,000',maxAmt:'100,000',maturity:'-',callDate:'-',tenor:'12個月',
    risk:'穩健',investType:['收益'],assetSize:'小',entry:'單筆',
    feature:'一年期資金規劃；本行存戶專屬；限行動銀行申辦；美元計價，需留意匯率風險'}
];
/* 債券商品詳情頁共用的發行機構風險提示，附加在個別 issuerInfo 之後——不是
   AI_Behavior_Instruction §8.10 列舉的法定強制警語，用詞可以精簡，不受「不得改寫」限制 */
const BOND_ISSUER_DISCLAIMER='以上皆為公司（金融）債，收益主要來自票息，須留意利率、信用（發行人違約）與匯率風險；實際條件依個別票息、到期日與債信評等而定。';

/* ================= 商品篩選（依客戶屬性挑出符合需求的清單） =================
   風險接受度：使用者能接受的波動程度是「上限」，可以接受越明顯的波動，能看到的商品也越多
   資產規模：依總資產級距，篩掉超過使用者資金規模的門檻較高商品 */
function riskAllowed(tolerance){
  return tolerance==='穩健' ? ['穩健'] : ['穩健','中等','積極'];
}
function assetSizeRank(v){return {'小':1,'中':2,'大':3}[v]||1;}
/* '100 萬以下' 是舊鍵，題目1（S.assetRange）已拆成'50 萬以下'／'50–100 萬'兩個新選項，
   不會再產生這個字串，但 stageH1()（他行資產級距，存到 S.h1Amt，見 flow.js）目前仍沿用
   原本三選項、沒有跟著拆，這裡保留舊鍵給它用，不要刪掉。 */
function assetRangeRank(range){
  return {'50 萬以下':1,'50–100 萬':1,'100 萬以下':1,'100 萬 – 200 萬':2,'100 萬–200 萬':2,'200 萬以上':3}[range]||1;
}
function assetTierAllowed(range){
  const v=assetRangeRank(range);
  return ['小','中','大'].filter(t=>assetSizeRank(t)<=v);
}
/* 補充路徑（H）沒有直接對應的風險承受度題，資產規模則取本行／他行兩邊級距較大的一邊 */
function biggerAssetTierAllowed(rangeA,rangeB){
  const v=Math.max(assetRangeRank(rangeA),assetRangeRank(rangeB));
  return ['小','中','大'].filter(t=>assetSizeRank(t)<=v);
}
/* cats：['bond']／['fund']／['bond','fund']；riskTiers：riskAllowed() 的結果；assetTiers：assetTierAllowed() 的結果 */
function matchCatalog(cats,riskTiers,assetTiers){
  return CATALOG.filter(p=>cats.includes(p.cat)&&riskTiers.includes(p.risk)&&assetTiers.includes(p.assetSize));
}
/* 法規要求：推薦清單不能只呈現一檔商品。篩選後不足 min 檔時依序放寬：
   1) 先放寬資產規模門檻——只是讓使用者多一個「門檻較高」的選項可以比較，不影響風險適合度
   2) 資產規模全開了還不夠，才不得已放寬風險層級——每張商品卡片仍會標示實際風險等級（穩健／中等／積極），
      使用者仍能一眼看出哪些超出原本設定的風險承受度，不會被誤導
   任一階段一旦達到 min 檔就停止放寬，避免不必要地擴大清單 */
function matchCatalogAtLeast(cats,riskTiers,assetTiers,min){
  min=min||2;
  let items=matchCatalog(cats,riskTiers,assetTiers);
  if(items.length>=min)return items;
  const widerAsset=['小','中','大'];
  items=matchCatalog(cats,riskTiers,widerAsset);
  if(items.length>=min)return items;
  const widerRisk=['穩健','中等','積極'];
  return matchCatalog(cats,widerRisk,widerAsset);
}
function catalogItem(code){return CATALOG.find(p=>p.code===code);}
