/* ============================================================
   商品資料（共用，來源：精選債券基金_客戶屬性對照矩陣_V2_1.xlsx，2026.09 更新，
   新增 BD405/372/355/357/277/306/363、FUND6–10 共 12 檔商品）
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
    /* assetSize 原標'中'（理由：面額 20萬換算南非幣實際等值僅約 11,000 美元，跟其他標'中'的
       美元 10,000 面額債券同一量級）。V2_1 矩陣把「適合資產總值」官方改標為'大'——本表唯一
       一檔'大'，改回跟著源檔走，不再自行覆寫；本表目前也只有這一檔是'大'，是
       assetTierAllowed()（見下方）之所以要改成永遠開放全部級距、不再依賴 S.assetRange
       gating 的原因：拿掉「初始資產級距」這題後，若還讓 assetTierAllowed() 用固定預設值
       篩選，這檔會變成永遠篩不出來 */
    risk:'積極',investType:['收益','成長'],assetSize:'大',entry:'單筆',
    feature:'到期贖回價 150%；持有期領息 6.6%；南非幣結構型，匯率風險最高，門檻最高',
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
  {code:'BD405',cat:'bond',name:'輝達 NVIDIA CORP',currency:'USD',rate:0.05625,rate1y:0.05625,rate3y:0.05625,refPrice:92,
    payFreq:'半年配',minAmt:'100,000',maturity:'2056/6/15',callDate:'2055/12/15',
    risk:'穩健',investType:['收益'],assetSize:'中',entry:'單筆',
    feature:'2026 年輝達史上最大規模美元債券發行（200 億美元）之一環，資金用於 AI 資料中心／基礎建設投資；現行發行人信評 Aa1(Moody\'s)/AA(S&P)，惟此券發行時信評未查得'},
  {code:'BD372',cat:'bond',name:'嬌生公司 JOHNSON & JOHNSON',currency:'USD',rate:0.0525,rate1y:0.0525,rate3y:0.0525,refPrice:98,
    payFreq:'半年配',minAmt:'100,000',maturity:'2054/6/1',callDate:'2053/12/1',
    risk:'穩健',investType:['收益'],assetSize:'中',entry:'單筆',
    feature:'全球僅兩家獲標普 AAA 信評之公司之一（另一家為微軟），信評優於美國政府公債；Aaa(Moody\'s)/AAA(S&P)'},
  {code:'BD355',cat:'bond',name:'華特迪士尼公司 WALT DISNEY COMPANY',currency:'USD',rate:0.054,rate1y:0.054,rate3y:0.054,refPrice:98,
    payFreq:'半年配',minAmt:'5,000',maturity:'2043/10/1',callDate:'-',
    risk:'穩健',investType:['收益'],assetSize:'小',entry:'單筆',
    feature:'全球最大多元化媒體娛樂集團之一（主題樂園、影業、串流、傳播事業）；此券不可提前贖回（non-callable）'},
  {code:'BD357',cat:'bond',name:'輝瑞大藥廠 PFIZER INC',currency:'USD',rate:0.053,rate1y:0.053,rate3y:0.053,refPrice:92,
    payFreq:'半年配',minAmt:'100,000',maturity:'2053/5/19',callDate:'2052/11/19',
    risk:'積極',investType:['收益'],assetSize:'中',entry:'單筆',
    feature:'為輝瑞 2023 年收購癌症藥廠 Seagen（430 億美元）所發行 310 億美元公司債之一環，為製藥業史上最大規模債券發行之一；信評 A1(Moody\'s)/A+(S&P)'},
  {code:'BD277',cat:'bond',name:'梅賽德斯-賓士金融北美 MERCEDES-BENZ FIN NA',currency:'USD',rate:0.085,rate1y:0.085,rate3y:0.085,refPrice:114,
    payFreq:'半年配',minAmt:'5,000',maturity:'2031/1/18',callDate:'約 2027/1/6（推估，非確認值）',
    risk:'積極',investType:['收益'],assetSize:'小',entry:'單筆',
    feature:'賓士集團（Mercedes-Benz Group）美國融資子公司，由賓士集團保證；票息 8.5% 為本表最高；信評 S&P A／Moody\'s A2／Fitch A；首次贖回日為依同類賓士金融債券條款推估，非本券確認值，請以實際申購產品說明書為準'},
  /* BD306：來源 Excel 明確標註「適合資產總值」欄未查得具體門檻、故未填寫——assetSize 留空
     會導致 matchCatalog() 的 .includes(p.assetSize) 永遠比對不到，這檔會變成永遠篩不出來。
     這裡先比照信評相近（Moody's A2／S&P A）、同為美國車廠融資子公司性質的其他'中'檔債券
     （如 BD337 Aa-級距）給一個暫定值，minAmt 同樣是估算值，兩者都待業務／商品負責人
     核對實際產品說明書後修正，不是官方數字 */
  {code:'BD306',cat:'bond',name:'寶馬美國資本 BMW US CAPITAL LLC',currency:'USD',rate:0.0515,rate1y:0.0515,rate3y:0.0515,refPrice:100,
    payFreq:'半年配',minAmt:'10,000',maturity:'2033/8/11',callDate:'約 2034/1/2（推估，非確認值）',
    risk:'穩健',investType:['收益'],assetSize:'中',entry:'單筆',
    feature:'BMW 集團美國融資子公司，由 BMW 集團保證；信評 Moody\'s A2／S&P A，官方風險等級 RR3（中風險）；首次贖回日為依同類 BMW 債券條款推估，非本券確認值，請以實際申購產品說明書為準'},
  {code:'BD363',cat:'bond',name:'美國國庫債券 United States Treasury Note/Bond',currency:'USD',rate:0.045,rate1y:0.045,rate3y:0.045,refPrice:101,
    payFreq:'半年配',minAmt:'1,000',maturity:'2029/5/31',callDate:'-',
    risk:'穩健',investType:['收益'],assetSize:'小',entry:'單筆',
    feature:'美國公債，主權信用最高、無違約風險；不可提前贖回（non-callable）；最低申購金額 US$1,000，門檻為本表最低'},
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
  /* FUND6–10：rate 欄沿用既有慣例（供試算卡示範用途），但新增這 5 檔沒有另外查到獨立的
     配息率示範數字來源，直接等於 rate1y（近一年報酬率），不臆造一個查無來源的配息率——
     跟 FUND1–5 的 rate（人工另填的示範配息率，非 Excel 欄位）不是同一個資料來源，這裡
     選擇「不假造」而不是「跟著同一套風格編一個」*/
  {code:'FUND6',cat:'fund',name:'凱基未來樂活多重資產基金',currency:'TWD',rate:0.1426,rate1y:0.1426,rate3y:0.164,nav:11.95,return1y:0.1426,
    payFreq:'月配',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'穩健',investType:['平衡'],assetSize:'小',entry:'單筆／定期定額',
    feature:'多重資產基金，配置國內外股票、債券、基金受益憑證、ETF 及 REITs，追求穩定收益及中長期資本增值；官方風險報酬等級 RR3'},
  {code:'FUND7',cat:'fund',name:'凱基未來世代關鍵收息多重資產基金',currency:'TWD',rate:0.2536,rate1y:0.2536,rate3y:0.1691,nav:11.81,return1y:0.2536,
    payFreq:'月配',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'中等',investType:['平衡','收益'],assetSize:'小',entry:'單筆／定期定額',
    feature:'多重資產基金，配置全球股票及固定收益資產，單一資產類別占比不超過淨值 70%，外幣證券比重至少 60%；官方風險報酬等級 RR4'},
  /* FUND8：新臺幣月配級別 2024/7/10 成立、未滿三年，本身就沒有真正的三年報酬率數據——
     Excel 這欄（rate3y 換算前的原始值 84.64%）已經是「以近一年報酬率 22.68% 複利推算 3 年」
     的估算值，不是實際績效；這裡再除以 3 換算成試算卡的等效年化格式，等於在估算值上又疊了
     一層近似，跟 FUND1–5 那種「Excel 揭露的就是真實三年累積報酬率、只是拿來換算年化」的
     情況不同，數字的不確定性比其他檔案更高，之後基金公司揭露正式三年數字要優先換過去 */
  {code:'FUND8',cat:'fund',name:'野村全球科技多重資產基金',currency:'TWD',rate:0.2268,rate1y:0.2268,rate3y:0.2821,nav:13.31,return1y:0.2268,
    payFreq:'月配',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'積極',investType:['收益','成長'],assetSize:'小',entry:'單筆／定期定額',
    feature:'採動態股債配置策略，鎖定全球科技題材並運用供應鏈分析挑選科技領導廠商，兼顧波動控管；官方風險報酬等級 RR4'},
  {code:'FUND9',cat:'fund',name:'摩根太平洋科技基金',currency:'USD',rate:0.6608,rate1y:0.6608,rate3y:0.4702,nav:182.42,return1y:0.6608,
    payFreq:'不配息',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'積極',investType:['成長'],assetSize:'小',entry:'單筆／定期定額',
    feature:'至少 70% 資產投資科技相關產業（含科技、媒體、電信）之亞太地區（含日本）企業，追求長期資本增值；官方風險報酬等級 RR5（最高風險）'},
  {code:'FUND10',cat:'fund',name:'東方匯理基金美國鋒裕股票',currency:'USD',rate:0.1777,rate1y:0.1777,rate3y:0.242,nav:33.33,return1y:0.1777,
    payFreq:'不配息',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'積極',investType:['成長'],assetSize:'小',entry:'單筆／定期定額',
    feature:'主要投資美國大型股，追求資本利得；官方風險報酬等級 RR4'},
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

/* ================= ETF 精選清單（js/flow.js showETFPicks() 專用） =================
   刻意獨立於 CATALOG 之外，不放進共用商品陣列：這三檔只透過「我還是想再保守一點，偏好ETF」
   這個使用者主動點選的專屬入口帶出（見 enterProductCalc()），不是本行既有問卷（風險承受度／
   資產規模）算出來的推薦結果——放進 CATALOG 會被 matchCatalog() 依 risk／assetSize 撈進一般
   債券／基金推薦清單，語意不對，使用者會在還沒表態「想要ETF」之前就看到這三檔。
   cat 沿用 'fund'：ETF 本質上是基金的一種（受益憑證、可在集中市場交易），card/product／
   catalogDisclaimerLines() 這些既有元件都是依 cat 判斷欄位與警語，用 'fund' 才能直接沿用
   現成的「近一年報酬率／基金淨值」欄位對應與基金風險警語，不用另外開一個 'etf' 分支。
   三檔都是追蹤台灣市值前 50 大公司的市值型ETF；009816 是凱基投信自家發行（isOwnBrand()
   認得出來），排第一檔，呼應「凱基也提供多元的ETF」這句話。
   NAV／近一年報酬率為 2026-09-07 網路查證的參考數字（0050／006208 為市場成交價概數，
   009816 為官方淨值），非即時官方數據，正式上線前需業務或商品負責人覆核；009816 是
   2026/1/22 才成立的新基金，還沒有滿一年，這裡的報酬率是成立以來的參考數字，不是
   真正的年化報酬率——跟 catalog.js 開頭 FUND8 那則說明是同一種「示範用途、非正式數字」
   的處理方式。 */
const ETF_PICKS=[
  {code:'009816',cat:'fund',name:'凱基台灣TOP50 ETF',currency:'TWD',rate:0.18,rate1y:0.18,rate3y:0.18,nav:15.91,navLabel:'收盤價',return1y:0.18,
    payFreq:'不配息',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'積極',investType:['成長'],assetSize:'小',entry:'單筆／定期定額',
    feature:'凱基投信發行；追蹤特選臺灣TOP50指數，市值型；台灣首檔不配息ETF，成分股股利留在基金內部再投入；2026/1/22 成立，未滿一年無完整年度績效，報酬率為成立以來參考數字',
    managerInfo:'凱基投信發行的市值型ETF，追蹤台灣市值前50大企業，成分股獲配的現金股利留在基金內部再投入，訴求長期複利累積、不另外配息。2026年初成立，尚無完整一年績效紀錄。'},
  {code:'0050',cat:'fund',name:'元大台灣50 ETF',currency:'TWD',rate:0.35,rate1y:0.35,rate3y:0.28,nav:107.9,navLabel:'收盤價',return1y:0.35,
    payFreq:'半年配',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'積極',investType:['成長'],assetSize:'小',entry:'單筆／定期定額',
    feature:'元大投信發行；追蹤台灣50指數，市值型；台灣規模最大、歷史最悠久的ETF之一，2003年成立',
    managerInfo:'元大投信發行的市值型ETF，追蹤台灣市值前50大企業，是台灣歷史最悠久、規模數一數二的ETF，長期績效貼近大盤表現。'},
  {code:'006208',cat:'fund',name:'富邦台50 ETF',currency:'TWD',rate:0.35,rate1y:0.35,rate3y:0.28,nav:247.25,navLabel:'收盤價',return1y:0.35,
    payFreq:'半年配',minAmt:'小額',maturity:'-',callDate:'-',
    risk:'積極',investType:['成長'],assetSize:'小',entry:'單筆／定期定額',
    feature:'富邦投信發行；追蹤台灣50指數，市值型；內扣費用率同類型中相對較低',
    managerInfo:'富邦投信發行的市值型ETF，追蹤台灣市值前50大企業，跟0050追蹤同一指數，內扣總費用率相對較低。'}
];

/* ================= 商品篩選（依客戶屬性挑出符合需求的清單） =================
   風險接受度：使用者能接受的波動程度是「上限」，可以接受越明顯的波動，能看到的商品也越多
   資產規模：補充路徑（H）用本行／他行兩邊級距篩掉超過使用者資金規模的門檻較高商品，
   見 biggerAssetTierAllowed()；一開始（accept 路徑）的 assetTierAllowed() 已經不再篩選，
   理由見下方該函式的說明 */
function riskAllowed(tolerance){
  return tolerance==='穩健' ? ['穩健'] : ['穩健','中等','積極'];
}
function assetSizeRank(v){return {'小':1,'中':2,'大':3}[v]||1;}
/* '100 萬以下' 是舊鍵，stepB()（S.assetRange 那題）已拆成'50 萬以下'／'50–100 萬'兩個新選項，
   不會再產生這個字串，但 stageH1()（他行資產級距，存到 S.h1Amt，見 flow.js）目前仍沿用
   原本三選項、沒有跟著拆，這裡保留舊鍵給它用，不要刪掉。 */
function assetRangeRank(range){
  return {'50 萬以下':1,'50–100 萬':1,'100 萬以下':1,'100 萬 – 200 萬':2,'100 萬–200 萬':2,'200 萬以上':3}[range]||1;
}
/* stepB() 的「初始資產級距」這題已經拿掉、不再讓使用者選，S.assetRange 固定是
   resetAll() 給的預設值（見 engine.js），不再是使用者的真實輸入。如果這裡繼續照舊用
   assetRangeRank(range) 去收斂 assetTiers，等於用一個寫死的常數決定「哪些 assetSize
   的商品看得到」——本表目前只有 BD395 是 assetSize:'大'，一旦預設值對應的級距不到最高檔，
   這檔會變成永遠篩不出來、沒有任何情境能推薦到它（其他題目都不影響 assetSize 這個維度）。
   所以這裡不再依賴 S.assetRange，直接開放全部級距，讓 accept 路徑（stageGList()）的
   商品覆蓋率跟 cats／risk 這兩個維度一樣完整，不受「拿掉選擇題」影響；資產規模的篩選
   只留給補充路徑（H）的 biggerAssetTierAllowed()，那裡還有 S.h1Amt 這個使用者真實填寫的
   信號可以依靠 */
function assetTierAllowed(range){
  return ['小','中','大'];
}
/* 補充路徑（H）沒有直接對應的風險承受度題，資產規模則取本行／他行兩邊級距較大的一邊；
   rangeA（S.assetRange）現在固定是 resetAll() 的預設值（見上方 assetTierAllowed() 的說明），
   只要那個預設值對應的 rank 是最低的 1（目前是），Math.max() 就會實質上完全由 rangeB
   （S.h1Amt，使用者真實填寫的他行資產級距）決定，不會被寫死的 rangeA 蓋掉 */
function biggerAssetTierAllowed(rangeA,rangeB){
  const v=Math.max(assetRangeRank(rangeA),assetRangeRank(rangeB));
  return ['小','中','大'].filter(t=>assetSizeRank(t)<=v);
}
/* 自家商品優先排在清單最前面（其餘商品彼此的相對順序不變——Array.sort 是穩定排序，
   只是把自家這批整批搬到前面，不重新洗牌）。放在 matchCatalog() 這裡一次處理，
   matchCatalogAtLeast() 不管走哪一段放寬邏輯、showCatalogCards() 依 cat 分組顯示時，
   都會自動吃到排序後的順序，不用每個呼叫端各自排一次。
   「自家」判斷分兩種：① cat==='deposit' 的美元定存本來就是本行存戶專屬商品，不需要
   看名稱字串——商品名稱只寫「美元定存 7天」這類天期描述，沒有冠上「凱基」兩個字，
   但性質上百分之百是自家商品；② 債券／基金都是引進的第三方商品，只有名稱帶「凱基」
   的基金（凱基投信發行）才算自家，債券目前 13 檔全部是外商發行，沒有一檔算自家 */
function isOwnBrand(p){return p.cat==='deposit'||p.name.includes('凱基');}
/* cats：['bond']／['fund']／['bond','fund']；riskTiers：riskAllowed() 的結果；assetTiers：assetTierAllowed() 的結果 */
function matchCatalog(cats,riskTiers,assetTiers){
  return CATALOG.filter(p=>cats.includes(p.cat)&&riskTiers.includes(p.risk)&&assetTiers.includes(p.assetSize))
    .sort((a,b)=>(isOwnBrand(a)?0:1)-(isOwnBrand(b)?0:1));
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
