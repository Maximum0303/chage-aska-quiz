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
      $('myExport').disabled=true;$('myClear').disabled=true;return;}
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
  }
  window.addEventListener('ca-quiz-finished',e=>{
    const i=e.detail||{},mode=String(i.mode||'');
    if(mode!=='10'&&mode!=='20')return;
    const data=read(),notice=$('myRecordSaved');
    if(!data){if(notice){notice.textContent='マイ記録を保存できませんでした。';notice.classList.remove('hidden')}return}
    const rec={id:String(i.sessionId||crypto.randomUUID()).slice(0,128),correct:Number(i.correct),total:Number(i.total),
      elapsedMs:Math.max(0,Math.round(Number(i.elapsedMs)||0)),completedAt:new Date().toISOString(),
      era:String(i.era||'').slice(0,60),category:String(i.category||'').slice(0,60)};
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
