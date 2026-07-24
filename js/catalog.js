/* ============================================================
   商品資料（共用，來源：精選債券基金_客戶屬性對照矩陣.xlsx，2026.06）
   異動請對照原始 Excel「商品對照矩陣」工作表一起更新，欄位定義見該檔「篩選說明」工作表。
   - rate／rate1y：以票面利率（債券）或示範性年化報酬（基金）表示，供試算卡使用
   - rate3y：近三年年化參考值。債券票面利率固定，1年/3年數字相同；
     基金無公開票面利率，rate1y／rate3y 為示範性參考值（非真實歷史績效），僅供試算展示
   - risk：穩健／中等／積極（風險接受度，稻越高風險越大）
   - cat：bond／fund／deposit（deposit 為屬性 C 的美元定存天期商品，rate 為銀行公告牌告利率，非試算示範值）
   - investType：['收益'|'平衡'|'成長']，可複選
   - assetSize：小／中／大（對應最低申購門檻的資產規模建議）
   - tenor：僅 deposit 商品使用，顯示用的天期文字（如「7天」「12個月」）
   ============================================================ */
const CATALOG=[
  {code:'BD337',cat:'bond',name:'美林 Merrill Lynch BV',currency:'AUD',rate:0.051,rate1y:0.051,rate3y:0.051,
    payFreq:'月配',minAmt:'10,000',maturity:'2044/2/1',callDate:'2029/2/1',
    risk:'穩健',investType:['收益'],assetSize:'中',entry:'單筆',
    feature:'月月配息；高信評 AA-（本表信評最高）；澳幣匯率風險'},
  {code:'BD395',cat:'bond',name:'摩根士丹利金融',currency:'ZAR',rate:0.066,rate1y:0.066,rate3y:0.066,
    payFreq:'季配',minAmt:'200,000',maturity:'2040/10/23',callDate:'-',
    risk:'積極',investType:['收益','成長'],assetSize:'大',entry:'單筆',
    feature:'到期贖回價 150%；持有期領息 6.6%；南非幣結構型，匯率風險最高、門檻最高'},
  {code:'BD396',cat:'bond',name:'Alphabet 公司',currency:'USD',rate:0.055,rate1y:0.055,rate3y:0.055,
    payFreq:'半年配',minAmt:'10,000',maturity:'2046/2/15',callDate:'2045/8/15',
    risk:'穩健',investType:['收益'],assetSize:'中',entry:'單筆',
    feature:'Google／YouTube 母公司；投資級科技龍頭；新發行票面 5%以上'},
  {code:'BD365',cat:'bond',name:'康卡斯特 Comcast',currency:'USD',rate:0.0565,rate1y:0.0565,rate3y:0.0565,
    payFreq:'半年配',minAmt:'10,000',maturity:'2054/6/1',callDate:'2053/12/1',
    risk:'穩健',investType:['收益'],assetSize:'中',entry:'單筆',
    feature:'美國第一大有線電視；環球影業（Universal）母公司；長天期'},
  {code:'BD398',cat:'bond',name:'Meta 平台公司',currency:'USD',rate:0.063,rate1y:0.063,rate3y:0.063,
    payFreq:'半年配',minAmt:'10,000',maturity:'2056/5/15',callDate:'2055/11/15',
    risk:'穩健',investType:['收益'],assetSize:'中',entry:'單筆',
    feature:'全球社群平台龍頭；美元券票面最高 6%以上；天期長'},
  {code:'BD348',cat:'bond',name:'高盛金融國際',currency:'USD',rate:0.045,rate1y:0.045,rate3y:0.045,
    payFreq:'月配',minAmt:'5,000',maturity:'2039/9/5',callDate:'2026/9/5',
    risk:'穩健',investType:['收益'],assetSize:'小',entry:'單筆',
    feature:'月月配息；門檻最低 USD 5,000；中長天期；首次贖回日近（2026/9/5），易被提前贖回'},
  {code:'FUND1',cat:'fund',name:'貝萊德全球智慧數據股票入息基金',currency:'USD',rate:0.08,rate1y:0.08,rate3y:0.06,
    payFreq:'可月配／穩定配',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'積極',investType:['收益','成長'],assetSize:'小',entry:'單筆／定期定額',
    feature:'AI 大數據量化選股；全球股票入息；持股 250–400 檔分散；配息可能來自本金'},
  {code:'FUND2',cat:'fund',name:'摩根多重收益基金',currency:'USD 等',rate:0.045,rate1y:0.045,rate3y:0.04,
    payFreq:'穩定月配',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'中等',investType:['平衡','收益'],assetSize:'小',entry:'單筆／定期定額',
    feature:'全球多重資產（債＋股＋REITs）；月月配息；含高收益債，配息可能來自本金'},
  {code:'FUND3',cat:'fund',name:'凱基收益成長多重資產基金',currency:'台幣／美元等',rate:0.05,rate1y:0.05,rate3y:0.045,
    payFreq:'月配',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'中等',investType:['平衡','成長'],assetSize:'小',entry:'單筆／定期定額',
    feature:'股債雙向＋掩護性買權收權利金；月配；含高收益債，配息可能來自本金'},
  {code:'FUND4',cat:'fund',name:'匯豐ESG永續多元資產組合基金',currency:'台幣／美元等',rate:0.035,rate1y:0.035,rate3y:0.032,
    payFreq:'月配息型可選',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'穩健',investType:['平衡'],assetSize:'小',entry:'單筆／定期定額',
    feature:'ESG 永續主題；股債平衡、債部位 50% 以上；風險等級 RR3，較保守'},
  {code:'FUND5',cat:'fund',name:'凱基台灣精五門基金',currency:'台幣',rate:0.09,rate1y:0.09,rate3y:0.07,
    payFreq:'不配息',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'積極',investType:['成長'],assetSize:'小',entry:'單筆／定期定額',
    feature:'台股五大趨勢產業；追求資本利得；RR4 股票型'},
  /* 屬性 C（保本安穩型）推薦商品：美元定存，依天期分為 5 檔，供橫向商品卡片列選擇（見 content-attr-c.js） */
  {code:'FDUSD07D',cat:'deposit',name:'美元定存 7天',currency:'USD',rate:0.10,rate1y:0.10,rate3y:0.10,
    payFreq:'到期領息',minAmt:'3,000',maturity:'-',callDate:'-',tenor:'7天',
    risk:'穩健',investType:['收益'],assetSize:'小',entry:'單筆',
    feature:'短天期資金靈活運用；本行存戶專屬；限行動銀行申辦；美元計價，需留意匯率風險'},
  {code:'FDUSD1M',cat:'deposit',name:'美元定存 1個月',currency:'USD',rate:0.045,rate1y:0.045,rate3y:0.045,
    payFreq:'到期領息',minAmt:'3,000',maturity:'-',callDate:'-',tenor:'1個月',
    risk:'穩健',investType:['收益'],assetSize:'小',entry:'單筆',
    feature:'短期資金停泊首選；本行存戶專屬；限行動銀行申辦；美元計價，需留意匯率風險'},
  {code:'FDUSD6M',cat:'deposit',name:'美元定存 6個月',currency:'USD',rate:0.04,rate1y:0.04,rate3y:0.04,
    payFreq:'到期領息',minAmt:'3,000',maturity:'-',callDate:'-',tenor:'6個月',
    risk:'穩健',investType:['收益'],assetSize:'小',entry:'單筆',
    feature:'半年期穩定收益；本行存戶專屬；限行動銀行申辦；美元計價，需留意匯率風險'},
  {code:'FDUSD9M',cat:'deposit',name:'美元定存 9個月',currency:'USD',rate:0.0385,rate1y:0.0385,rate3y:0.0385,
    payFreq:'到期領息',minAmt:'3,000',maturity:'-',callDate:'-',tenor:'9個月',
    risk:'穩健',investType:['收益'],assetSize:'小',entry:'單筆',
    feature:'中期資金規劃；本行存戶專屬；限行動銀行申辦；美元計價，需留意匯率風險'},
  {code:'FDUSD12M',cat:'deposit',name:'美元定存 12個月',currency:'USD',rate:0.0365,rate1y:0.0365,rate3y:0.0365,
    payFreq:'到期領息',minAmt:'3,000',maturity:'-',callDate:'-',tenor:'12個月',
    risk:'穩健',investType:['收益'],assetSize:'小',entry:'單筆',
    feature:'一年期資金規劃；本行存戶專屬；限行動銀行申辦；美元計價，需留意匯率風險'}
];

/* ================= 商品篩選（依客戶屬性挑出符合需求的清單） =================
   風險接受度：使用者能接受的波動程度是「上限」，可以接受越明顯的波動，能看到的商品也越多
   資產規模：依總資產級距，篩掉超過使用者資金規模的門檻較高商品 */
function riskAllowed(tolerance){
  return tolerance==='穩健' ? ['穩健'] : ['穩健','中等','積極'];
}
function assetSizeRank(v){return {'小':1,'中':2,'大':3}[v]||1;}
function assetRangeRank(range){
  return {'100 萬以下':1,'100 萬 – 200 萬':2,'100 萬–200 萬':2,'200 萬以上':3}[range]||1;
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
