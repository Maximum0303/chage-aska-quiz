/* CHAGE and ASKA 検定 — 登録なしマイ記録（ブラウザ内のみ） */
(() => {
  'use strict';
  const KEY = 'ca_quiz_my_records_v1';
  const MAX = 200;
  const $ = id => document.getElementById(id);
  let selected = '10';
  const empty = () => ({version:1, records:{'10':[],'20':[]}});
  const isRecord = (r, mode) => r && typeof r.id === 'string' && r.id.length <= 128 &&
    Number.isInteger(r.correct) && r.correct >= 0 && r.correct <= Number(mode) &&
    r.total === Number(mode) && Number.isFinite(r.elapsedMs) && r.elapsedMs >= 0 && r.elapsedMs <= 86400000 &&
    typeof r.completedAt === 'string' && Number.isFinite(Date.parse(r.completedAt)) &&
    typeof r.era === 'string' && typeof r.category === 'string';
  /* Per-question performance is stored in localStorage only; no answers or question text. */
  function sanitizeDetails(value, count){
    if(!Array.isArray(value)||value.length!==count)return [];
    const result=[];
    for(const item of value){
      if(!item||typeof item!=='object'||typeof item.correct!=='boolean')return [];
      const era=typeof item.era==='string'?item.era.slice(0,60):'';
      const categories=Array.isArray(item.categories)?[...new Set(item.categories.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.slice(0,80)))].slice(0,8):[];
      result.push({era,categories,correct:item.correct});
    }
    return result;
  }
  function recordDetailData(rows){
    return rows.flatMap(r=>sanitizeDetails(r.details,r.total));
  }
  function svgElement(name,attrs={},value){
    const el=document.createElementNS('http://www.w3.org/2000/svg',name);
    Object.entries(attrs).forEach(([key,val])=>el.setAttribute(key,String(val)));
    if(value!==undefined)el.textContent=value;
    return el;
  }
  function renderTrend(rows){
    const host=$('myTrendChart'),note=$('myTrendNote');
    if(!host||!note)return;
    host.replaceChildren();
    const recent=rows.slice(-20);
    if(!recent.length){note.textContent='まだグラフに表示する記録がありません。';return;}
    const W=640,H=210,L=48,R=18,T=18,B=42;
    const x=i=>recent.length===1?(L+(W-R))/2:L+i*(W-L-R)/(recent.length-1);
    const y=p=>T+(100-p)*(H-T-B)/100;
    const svg=svgElement('svg',{viewBox:'0 0 '+W+' '+H,role:'img','aria-label':'挑戦ごとの正答率の推移。最新'+recent.length+'回分。',class:'my-trend-svg'});
    [0,25,50,75,100].forEach(p=>{
      svg.append(svgElement('line',{x1:L,x2:W-R,y1:y(p),y2:y(p),stroke:'#405979','stroke-width':1}));
      svg.append(svgElement('text',{x:L-9,y:y(p)+5,'text-anchor':'end',fill:'#b8cde9','font-size':13},p+'%'));
    });
    const points=recent.map((r,i)=>[x(i),y(r.correct/r.total*100)]);
    if(points.length>1){
      svg.append(svgElement('polyline',{points:points.map(p=>p.map(n=>n.toFixed(1)).join(',')).join(' '),fill:'none',stroke:'#f0ce83','stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round'}));
    }
    points.forEach((p,i)=>{
      const r=recent[i];
      const dot=svgElement('circle',{cx:p[0],cy:p[1],r:5.5,fill:'#ffdf9e',stroke:'#102645','stroke-width':2});
      dot.append(svgElement('title',{},date(r.completedAt)+' '+r.correct+'/'+r.total+'問（'+Math.round(100*r.correct/r.total)+'%）'));
      svg.append(dot);
    });
    svg.append(svgElement('text',{x:L,y:H-9,fill:'#bacdec','font-size':13},'古い記録'));
    svg.append(svgElement('text',{x:W-R,y:H-9,'text-anchor':'end',fill:'#bacdec','font-size':13},'新しい記録'));
    host.append(svg);
    note.textContent='最近'+recent.length+'回の正答率。年代・ジャンルで絞った挑戦も含みます。';
  }
  function renderBreakdown(hostId,items,kind){
    const host=$(hostId);if(!host)return;host.replaceChildren();
    const map=new Map();
    for(const q of items){
      const keys=kind==='era'?[q.era]:(Array.isArray(q.categories)?q.categories:[]);
      for(const k of [...new Set(keys)]){
        if(!k)continue;
        const row=map.get(k)||{name:k,total:0,correct:0};
        row.total++; if(q.correct)row.correct++;map.set(k,row);
      }
    }
    const sorted=[...map.values()].sort((a,b)=>(a.correct/a.total-b.correct/b.total)||(b.total-a.total)||a.name.localeCompare(b.name,'ja'));
    if(!sorted.length){host.append(text('p','my-analysis-empty','分析に必要な記録がまだありません。'));return;}
    for(const r of sorted){
      const pct=Math.round(r.correct/r.total*100);
      const article=text('div','my-breakdown-item','');
      const head=text('div','my-breakdown-head','');
      head.append(text('strong','',r.name),text('span','',r.correct+'/'+r.total+'問 正解（'+pct+'%）'+(r.total<5?'・参考値':'')));
      const track=text('div','my-breakdown-track','');
      const fill=text('span','my-breakdown-fill','');fill.style.width=pct+'%';track.append(fill);
      article.append(head,track);host.append(article);
    }
  }
  function renderInsights(data,mode){
    const rows=data?.records?.[mode]||[];
    renderTrend(rows);
    const details=recordDetailData(rows);
    const old=rows.filter(r=>!Array.isArray(r.details)||r.details.length!==r.total).length;
    const note=$('myAnalysisNote');
    if(note)note.textContent=details.length
      ?'分析対象：'+details.length+'問（'+rows.length+'回中、詳細あり'+(rows.length-old)+'回）。正答率が低い順に表示。5問未満は参考値です。'
      :(rows.length?'以前の記録は詳細分類が保存されていません。次回の挑戦から分析が始まります。':'挑戦後、各問題の正誤から自動分析します。');
    renderBreakdown('myEraBreakdown',details,'era');
    renderBreakdown('myCategoryBreakdown',details,'category');
    const missing=details.some(q=>!q.categories.length);
    const caution=$('myCategoryCaution');
    if(caution)caution.textContent=missing?'一部の問題はジャンル分類が取得できていないため、ジャンル別集計に含まれません。':'';
  }
  function read(){
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return empty();
      const data = JSON.parse(raw);
      if (data.version !== 1 || !data.records || !Array.isArray(data.records['10']) || !Array.isArray(data.records['20'])) return null;
      return {version:1,records:{'10':data.records['10'].filter(r=>isRecord(r,'10')).slice(-MAX),
        '20':data.records['20'].filter(r=>isRecord(r,'20')).slice(-MAX)}};
    } catch {return null}
  }
  function save(data){try{localStorage.setItem(KEY,JSON.stringify(data));return true}catch{return false}}
  const time = ms => {
    const sec = Math.floor(ms / 1000);
    return String(Math.floor(sec/60)).padStart(2,'0') + ':' + String(sec%60).padStart(2,'0');
  };
  const date = iso => new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(iso));
  function text(tag,cl,value){const el=document.createElement(tag);el.className=cl;el.textContent=value;return el}
  function render(){
    const data=read(), status=$('myRecordsStatus'), list=$('myRecordsList');
    if(!status||!list)return;
    list.replaceChildren();
    document.querySelectorAll('[data-my-mode]').forEach(b=>{const on=b.dataset.myMode===selected;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))});
    if(!data){status.textContent='ブラウザの保存領域にアクセスできません。サイトデータの設定をご確認ください。';
      ['myAttempts','myBest','myAverage','myBestTime'].forEach(id=>$(id).textContent='—');
      $('myExport').disabled=true;$('myClear').disabled=true;renderInsights(null,selected);return;}
    const rows=data.records[selected],n=rows.length;
    const best=n?Math.max(...rows.map(r=>r.correct)):0;
    const bestTime=n?Math.min(...rows.filter(r=>r.correct===best).map(r=>r.elapsedMs)):0;
    const average=n?Math.round(rows.reduce((sum,r)=>sum+r.correct,0)/n/Number(selected)*100):0;
    $('myAttempts').textContent=n+'回';
    $('myBest').textContent=n?best+' / '+selected:'—';
    $('myAverage').textContent=n?average+'%':'—';
    $('myBestTime').textContent=n?time(bestTime):'—';
    const hasAny=!!(data.records['10'].length+data.records['20'].length);
    $('myExport').disabled=!hasAny;$('myClear').disabled=!hasAny;
    status.textContent=n?'最新'+Math.min(n,15)+'件を表示しています。各コース最大200件まで保存します。':'まだ記録はありません。挑戦を最後まで終えると保存されます。';
    rows.slice(-15).reverse().forEach(r=>{
      const li=document.createElement('li');
      const info=text('span','my-record-date',date(r.completedAt));
      const scope=[r.era,r.category].filter(Boolean).join(' / ');
      if(scope)info.append(text('small','my-record-scope',scope.slice(0,120)));
      const score=text('span','my-record-score',r.correct+' / '+r.total+'問');
      score.append(text('small','my-record-time',time(r.elapsedMs)+'（参考）'));
      li.append(info,score);list.append(li);
    });
    renderInsights(data,selected);
  }
  window.addEventListener('ca-quiz-finished',e=>{
    const i=e.detail||{},mode=String(i.mode||'');
    if(mode!=='10'&&mode!=='20')return;
    const data=read(),notice=$('myRecordSaved');
    if(!data){if(notice){notice.textContent='マイ記録を保存できませんでした。';notice.classList.remove('hidden')}return}
    const rec={id:String(i.sessionId||crypto.randomUUID()).slice(0,128),correct:Number(i.correct),total:Number(i.total),
      elapsedMs:Math.max(0,Math.round(Number(i.elapsedMs)||0)),completedAt:new Date().toISOString(),
      era:String(i.era||'').slice(0,60),category:String(i.category||'').slice(0,60),
      details:sanitizeDetails(i.details,Number(mode))};
    if(!isRecord(rec,mode))return;
    if(!data.records[mode].some(r=>r.id===rec.id)){
      data.records[mode].push(rec);data.records[mode]=data.records[mode].slice(-MAX);
      if(!save(data)){if(notice){notice.textContent='保存に失敗しました。ブラウザ設定をご確認ください。';notice.classList.remove('hidden')}return}
    }
    selected=mode;
    if(notice){notice.textContent='このブラウザに成績を保存しました。登録やログインは不要です。';notice.classList.remove('hidden')}
    render();
  });
  document.querySelectorAll('[data-my-mode]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.myMode;render()}));
  $('myClear').addEventListener('click',()=>{
    if(!confirm('このブラウザ内の10問・20問のマイ記録をすべて削除しますか？\n元には戻せません。公開ランキングやサーバー側の回答履歴は削除されません。'))return;
    try{localStorage.removeItem(KEY);render();$('myRecordsStatus').textContent='このブラウザのマイ記録を削除しました。'}catch{alert('削除できませんでした。')}
  });
  $('myExport').addEventListener('click',()=>{
    const data=read();if(!data)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='ca-quiz-my-records-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $('myImport').addEventListener('change',async e=>{
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    if(file.size>1024*1024){alert('1MB以内のファイルを指定してください。');return}
    try{
      const raw=JSON.parse(await file.text()),data=read();
      if(!data||raw.version!==1||!raw.records||!['10','20'].every(m=>Array.isArray(raw.records[m])))throw Error('バックアップ形式を確認できませんでした');
      if(!confirm('バックアップの記録をこのブラウザの記録に追加しますか？'))return;
      for(const mode of ['10','20']){
        const m=new Map(data.records[mode].map(r=>[r.id,r]));
        for(const r of raw.records[mode])if(isRecord(r,mode))m.set(r.id,r);
        data.records[mode]=[...m.values()].sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt)).slice(-MAX);
      }
      if(!save(data))throw Error('ブラウザに書き込めませんでした');render();alert('マイ記録を読み込みました。');
    }catch(error){alert('読み込みに失敗しました：'+String(error.message||error))}
  });
  render();
})();
