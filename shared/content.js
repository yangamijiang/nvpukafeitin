export const defaultContent = {
  home: { title: '让平凡的日子，', subtitle: '多一点', highlight: '心动魔法', greeting: 'おかえりなさいませ。', description: '一杯香浓咖啡，一份手作甜点，\n和只为你绽放的笑容。\n欢迎来到木漏れ日，你的专属治愈角落。', welcome: '今天也在这里，等你回家。' },
  shop: { name: '木漏れ日', tagline: '日々に、ちいさなときめきを。', storyTitle: '城市的一隅，', storyHighlight: '温柔的光。', story: '「木漏れ日」是阳光穿过树叶，洒落下来的细碎光影。\n我们想把这份温柔，藏进每一杯咖啡、每一次问候里。', storyMore: '无论是一个人的放空，还是和朋友分享的小小庆祝，\n都可以在这里，找到属于自己的舒服节奏。', visitTitle: '下一次见面，就在木漏れ日。', hours: 'OPEN 11:00 – 21:00 · 每周二店休 · 页面为咖啡厅概念展示' },
  menu: [
    {id:'parfait',name:'初恋草莓芭菲',jp:'いちごの恋するパフェ',price:48,category:'dessert',badge:'♡ 人气 No.1',description:'香甜草莓、香草奶油与酥脆谷物层层交叠，把初恋般的心动藏进一只玻璃杯。',allergens:'含乳制品、麸质；配料以实际门店为准。'},
    {id:'latte',name:'萌萌喵爪拿铁',jp:'にゃんこのふわふわラテ',price:36,category:'drink',badge:'女仆推荐',description:'浓缩咖啡与绵密牛奶轻柔融合，用一朵手作拉花，为今天补充温暖。',allergens:'含乳制品与咖啡因。'},
    {id:'omelet',name:'心动魔法蛋包饭',jp:'愛をこめたオムライス',price:58,category:'meal',badge:'♡ 施展美味魔法',description:'金黄柔嫩的蛋皮，包裹香气满满的番茄炒饭。画上一颗爱心，再念一句「おいしくな〜れ」。',allergens:'含鸡蛋；酱料可能含大豆与麸质。'},
    {id:'pancake',name:'云朵草莓松饼',jp:'いちごのふわふわパンケーキ',price:52,category:'dessert',badge:'手作限定',description:'松软的三层松饼搭配鲜奶油与草莓，淋上香甜糖浆，慢慢享受午后的悠闲。',allergens:'含乳制品、鸡蛋、麸质。'}
  ],
  maids: [ {name:'小樱',en:'Sakura',tag:'温柔系 · 甜点研究员',quote:'「今天也要把快乐，装进你的甜点里♡」'}, {name:'小葵',en:'Aoi',tag:'元气系 · 咖啡小魔法师',quote:'「准备好了吗？你的元气补给到啦！」'} ],
  news: [ {id:'spring',date:'2026-04-01',tag:'季节限定',title:'春日樱花季 · 把粉色的浪漫，藏进甜点里',text:'春天的小确幸，是草莓与樱花的相遇。我们的季节概念菜单加入轻盈奶油、草莓与樱花元素，用一份温柔的甜点，记录春日的好心情。',note:'本活动为网站内容展示，具体供应与活动日期待门店确认。'}, {id:'photo',date:'2026-03-20',tag:'店内活动',title:'记录心动瞬间：拍立得纪念服务上线啦 ♡',text:'在温暖的咖啡香里，为相聚留一张纪念。概念拍立得服务包含手写祝福与可爱贴纸装饰，让这一刻的笑容成为可以珍藏的小小幸福。',note:'本服务为概念展示，实际安排与价格待门店确认。'} ]
};
export const editorGroups = [
 {id:'home',label:'首页与店铺',fields:[['home.title','首页主标题',60],['home.subtitle','标题前缀',30],['home.highlight','强调文字',30],['home.greeting','日文问候',80],['home.description','首页介绍',600,'textarea'],['home.welcome','欢迎语',100],['shop.name','店铺名称',30],['shop.tagline','品牌标语',100],['shop.storyTitle','故事标题',60],['shop.storyHighlight','故事强调文字',40],['shop.story','我们的故事',1200,'textarea'],['shop.storyMore','故事补充',1200,'textarea'],['shop.visitTitle','到店邀请',100],['shop.hours','营业说明',200]]},
 {id:'menu',label:'甜蜜菜单',fields:defaultContent.menu.flatMap((item,i)=>[['name','菜品名称',50],['jp','日文名称',100],['price','价格（元）',9999,'number'],['badge','推荐标签',40],['description','菜品介绍',800,'textarea'],['allergens','过敏原提示',300,'textarea']].map(([key,label,max,type])=>[`menu.${i}.${key}`,`${item.name} · ${label}`,max,type]))},
 {id:'maids',label:'女仆手帖',fields:defaultContent.maids.flatMap((item,i)=>[['name','姓名',30],['en','英文名',50],['tag','个性标签',100],['quote','欢迎语',200]].map(([key,label,max])=>[`maids.${i}.${key}`,`成员 ${i+1} · ${label}`,max]))},
 {id:'news',label:'活动消息',fields:defaultContent.news.flatMap((item,i)=>[['date','日期',10,'date'],['tag','分类',30],['title','活动标题',150],['text','活动正文',2000,'textarea'],['note','补充说明',500,'textarea']].map(([key,label,max,type])=>[`news.${i}.${key}`,`活动 ${i+1} · ${label}`,max,type]))}
];
export function getPath(object,path){return path.split('.').reduce((value,key)=>value?.[key],object)}
export function setPath(object,path,value){const parts=path.split('.');const last=parts.pop();let target=object;for(const part of parts)target=target[part];target[last]=value}
export function validateContent(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('内容格式无效');
 const result=structuredClone(defaultContent);
 for(const group of editorGroups)for(const [path,label,max,type]of group.fields){
  const value=getPath(input,path);
  if(type==='number'){if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>max||Math.abs(Math.round(value*100)-value*100)>1e-8)throw new Error(`${label}须为 0–${max} 之间的金额，最多两位小数`)}
  else {if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(`${label}不能为空且不得超过 ${max} 字`);if(type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))throw new Error('活动日期无效')}
  setPath(result,path,typeof value==='string'?value.trim():value);
 }
 return result;
}
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
