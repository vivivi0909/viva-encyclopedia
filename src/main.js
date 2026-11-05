import './style.css';
import {entries,kindLabels,photos,catalogCounts,sources,heroPhoto} from './data.js';
import {filterEntries,compareEnvironment,readFavorites,formatRange,paginate} from './logic.js';
import {icon} from './icons.js';
import {findComparisonOptions} from './compare-picker.js';
import {emptyFacets,isAnimal,matchesFacets} from './taxonomy.js';
import {taxonomyHTML,facetsHTML} from './facet-ui.js';
import {detailedFields,environmentTags} from './detail-fields.js';
import {plantCandidate} from './habitat-matching.js';
import {prepareReverse} from './reverse-ui.js';
const $ = s => document.querySelector(s);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const regions=new Intl.DisplayNames(['ko'],{type:'region'});
const formatOrigin=value=>/^[A-Z]{2}(,[A-Z]{2})*$/.test(value)?value.split(',').map(c=>regions.of(c)).join(' · '):value;
let storage; try { storage=localStorage; } catch { storage=null; }
const state={facets:emptyFacets(),linkedAnimalId:null,kind:'all',query:'',group:'all',subgroup:'all',page:1,pageSize:24,difficulty:'all',environment:'all',favoritesOnly:false,favorites:readFavorites(storage,entries.map(e=>e.id)),sort:'recommended'};
let lastFocus;
const kindIcon=k=>({plant:'leaf',reptile:'animal',amphibian:'drop',arthropod:'animal',vivarium:'terrarium'}[k]||'book');
function specimenImage(e,cls='') {
 if(!e.image)return `<div class="catalog-placeholder ${e.kind}" role="img" aria-label="${escapeHTML(e.name)} ${e.photoFailed?'사진 불러오기 실패':'종별 사진 미등록'}"><span class="placeholder-taxonomy">${kindLabels[e.kind]} / ${escapeHTML(e.group)}</span>${icon(kindIcon(e.kind))}<strong>${e.latin.split(' ')[0]}</strong><em>${e.latin.split(' ').slice(1).join(' ')}</em><small>${e.photoFailed?'사진 불러오기 실패':'종별 사진 수집 대기'}</small></div>`;
 const alt=`${escapeHTML(e.name)} 실제 촬영 사진 · ${escapeHTML(e.photo?.photographer||'')}`;
 return e.tile ? `<svg class="specimen-photo ${cls}" viewBox="${e.tile[0]*512} ${e.tile[1]*512} 512 512" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${alt}"><image href="${e.image}" width="1536" height="1024"/></svg>` : `<img class="${cls}" src="${e.image}" alt="${alt}" loading="lazy">`;
}
const navItems=[['all','grid','전체 도감'],['plant','leaf','식물 도감'],['animal','animal','생물 도감'],['vivarium','terrarium','비바리움 도감']];
$('#app').innerHTML=`
<aside class="sidebar">
  <a href="#" class="brand" aria-label="VIVA 홈"><span class="brand-symbol">${icon('leaf')}</span><span>viva<span class="brand-dot">.</span><small>THE LIVING ENCYCLOPEDIA</small></span></a>
  <div class="nav-caption">작은 생태계를 탐험하세요</div>
  <nav aria-label="주 메뉴">${navItems.map(([key,i,title])=>`<button class="nav-item ${key==='all'?'active':''}" data-nav="${key}">${icon(i)}<span>${title}</span><small>${key==='all'?entries.length:entries.filter(e=>key==='animal'?isAnimal(e):e.kind===key).length}</small></button>`).join('')}
  <button class="nav-item" data-open-reverse>${icon('terrarium')}<span>비바리움 역검색</span></button><div class="nav-divider"></div><button class="nav-item" data-nav="favorites">${icon('heart')}<span>나의 즐겨찾기</span><small id="favorite-count">0</small></button><button class="nav-item" data-open-compare>${icon('compare')}<span>환경 적합성 비교</span><span class="new-label">NEW</span></button></nav>
  <div class="sidebar-note"><span class="little-leaf">${icon('leaf')}</span><h3>작은 관심이,<br>하나의 생태계로.</h3><p>알아갈수록 더 가까워지는 자연.<br>나만의 초록 세상을 만나보세요.</p><span class="note-line"></span><small>GROW YOUR LITTLE WORLD</small></div>
  <div class="sidebar-bottom"><span class="status-dot"></span> 자연을 배우고, 생명을 돌보다</div>
</aside>
<div class="main-shell">
  <header class="topbar"><div class="breadcrumb">VIVA FIELD GUIDE <span>/</span> <b id="breadcrumb-current">전체 도감</b></div><div class="topbar-right"><button class="top-reverse" data-open-reverse aria-label="비바리움 역검색 바로가기">${icon('terrarium')} 역검색</button><span class="edition">A LITTLE CLOSER TO NATURE</span><button class="top-heart" data-nav="favorites" aria-label="즐겨찾기 보기">${icon('heart')}</button><span class="avatar">V</span></div></header>
  <main>
    <section class="hero" aria-labelledby="hero-title"><div class="hero-image" role="img" aria-label="실제 촬영한 잔디의 질감"></div><div class="hero-shade"></div><div class="hero-content"><span class="eyebrow"><span></span> YOUR LITTLE WORLD, ALIVE.</span><h1 id="hero-title">작은 생태계,<br>무한한 발견<span>.</span></h1><p>초록빛 식물부터 신비로운 작은 동물까지.<br>나만의 비바리움을 위한 모든 이야기를 만나보세요.</p><button class="hero-button" id="explore-button">도감 탐색하기 ${icon('arrow')}</button></div><div class="hero-footnote"><span>FIELD NOTES — 001</span><a href="${heroPhoto.sourcePage}" target="_blank" rel="noopener noreferrer">실제 사진: ${heroPhoto.photographer} · CC0</a></div><div class="hero-seal">A WORLD<br><span>worth</span><br>DISCOVERING</div></section>
    <section class="category-grid" aria-label="도감별 탐색">${[['plant','leaf','식물 도감','초록의 다양한 모습', 'BOTANICAL'],['animal','animal','생물 도감','파충류 · 양서류 · 등각류·절지류','ANIMALS'],['vivarium','terrarium','비바리움 도감','나만의 작은 자연','HABITAT']].map(([key,i,title,desc,en])=>`<button class="category-card" data-category="${key}"><span class="category-icon ${key}">${icon(i)}</span><span class="category-copy"><small>${en}</small><strong>${title}<span>${entries.filter(e=>key==='animal'?isAnimal(e):e.kind===key).length}</span></strong><span>${desc}</span></span>${icon('chevron')}</button>`).join('')}</section>
    <div id="taxonomy-home"></div><section id="explore" class="explore" aria-labelledby="section-title"><div class="section-heading"><div><span class="section-eyebrow">THE LIVING COLLECTION</span><h2 id="section-title">생명의 취향을 발견하세요<span class="title-dot">.</span></h2></div><p>하나씩 알아가는, 함께 살아갈 세계</p></div>
      <form class="search-box" role="search"><label for="search" class="sr-only">도감 검색</label>${icon('search')}<input id="search" type="search" placeholder="어떤 생명이 궁금하세요? 이름, 학명, 키워드로 검색해 보세요" autocomplete="off"><button type="button" id="clear-search" hidden aria-label="검색어 지우기">${icon('close')}</button><kbd>/</kbd></form>
      <div class="collection-tabs" role="group" aria-label="도감 종류">${[['all','전체'],['plant','식물'],['animal','생물 도감'],['vivarium','비바리움']].map(([k,t])=>`<button data-tab="${k}" class="tab ${k==='all'?'active':''}" aria-pressed="${k==='all'}">${t}<span>${k==='all'?entries.length:entries.filter(e=>k==='animal'?isAnimal(e):e.kind===k).length}</span></button>`).join('')}</div>
      <div id="facet-panel"></div><div id="plant-link-banner"></div><div class="filters"><span class="filter-label">${icon('sliders')} 필터</span><label><span class="sr-only">세부 분류</span><select id="group" aria-label="세부 분류"><option value="all">모든 분류</option></select></label><label><span class="sr-only">세부 유형</span><select id="subgroup" aria-label="세부 유형"><option value="all">모든 세부 유형</option></select></label><label><span class="sr-only">관리 난이도</span><select id="difficulty" aria-label="관리 난이도"><option value="all">모든 난이도</option><option>쉬움</option><option>보통</option><option>어려움</option><option>자료 확인</option></select></label><label><span class="sr-only">사육 환경</span><select id="environment" aria-label="사육 환경"><option value="all">모든 환경</option>${[...new Set(entries.map(e=>e.environment))].sort((a,b)=>a.localeCompare(b,'ko')).map(v=>`<option>${v}</option>`).join('')}</select></label><button id="reset-filters">초기화 <span>↺</span></button></div>
      <div class="results-heading"><p id="result-count" role="status" aria-live="polite"></p><button class="compare-current-results" data-open-compare data-use-results>검색 결과에서 비교 ${icon('compare')}</button><label>정렬 <select id="sort"><option value="recommended">추천순</option><option value="name">이름순</option><option value="easy">쉬운 순</option></select></label></div>
      <div class="catalog-notice"><b>출처를 따라 알아가는 도감</b><span>무늬 변이·유통명은 종 수에서 제외했습니다. 종별 사진이 없는 항목은 자료 카드로 표시합니다. 기본값·기초 자료는 별도 표시하며, 미확인 수치로 환경 적합성을 판단하지 않습니다.</span><button id="sources-shortcut">수록 기준 · 출처 보기 ↗</button></div><div id="cards" class="cards"></div><nav id="pagination" class="pagination" aria-label="도감 페이지"></nav>
    </section>
    <section class="compare-banner"><div class="compare-banner-icon">${icon('compare')}</div><div><span>BETTER TOGETHER?</span><h2>함께 살기 좋은 환경일까요?</h2><p>식물과 동물의 온도·습도 조건을 나란히 비교해 보세요.</p></div><button class="button primary" data-open-compare>환경 적합성 비교 ${icon('arrow')}</button></section>
    <footer><a href="#" class="footer-brand">viva.</a><p>작은 생태계를 위한, 끝없는 호기심.</p><button id="about-button">도감 안내 · 자료 출처 ${icon('arrow')}</button><small>© ${new Date().getFullYear()} VIVA ENCYCLOPEDIA</small></footer>
  </main>
</div>
<dialog id="detail-dialog" class="detail-dialog"></dialog>
<dialog id="compare-dialog" class="compare-dialog"></dialog>
<dialog id="reverse-dialog" class="reverse-dialog"></dialog><dialog id="about-dialog" class="about-dialog"></dialog>
<div id="toast" class="toast" role="status" aria-live="polite"></div>`;
$('.hero-image').style.backgroundImage=`url("${photos.forest}")`;
function updateGroups(){
  const groups=[...new Set(entries.filter(e=>state.kind==='all'||(state.kind==='animal'?isAnimal(e):e.kind===state.kind)).map(e=>e.group))];
  $('#group').replaceChildren(new Option('모든 분류','all'),...groups.map(g=>new Option(g,g)));
  $('#group').value=state.group;updateSubgroups();
}
function updateSubgroups(){const types=[...new Set(entries.filter(e=>(state.kind==='all'||(state.kind==='animal'?isAnimal(e):e.kind===state.kind))&&(state.group==='all'||e.group===state.group)).map(e=>e.subgroup).filter(Boolean))];if(!types.includes(state.subgroup))state.subgroup='all';$('#subgroup').replaceChildren(new Option('모든 세부 유형','all'),...types.sort().map(t=>new Option(t,t)));$('#subgroup').value=state.subgroup;}
function updateNavigation(){
  document.querySelectorAll('[data-nav]').forEach(el=>{const active=state.favoritesOnly?el.dataset.nav==='favorites':el.dataset.nav===state.kind;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  document.querySelectorAll('[data-tab]').forEach(el=>{const active=el.dataset.tab===state.kind;el.classList.toggle('active',active);el.setAttribute('aria-pressed',active);});
  document.querySelectorAll('[data-category]').forEach(el=>el.classList.toggle('selected',el.dataset.category===state.kind));
  $('#favorite-count').textContent=state.favorites.length;
  $('#breadcrumb-current').textContent=state.favoritesOnly?'나의 즐겨찾기':navItems.find(n=>n[0]===state.kind)[2];
  $('#section-title').innerHTML=state.favoritesOnly?'내가 담은 작은 생태계<span class="title-dot">.</span>':'생명의 취향을 발견하세요<span class="title-dot">.</span>';
}
function currentCatalogResults(){let result=filterEntries(entries,state);if(state.linkedAnimalId){const animal=entries.find(e=>e.id===state.linkedAnimalId);result=result.filter(e=>e.kind==='plant'&&plantCandidate(animal,e).status==='review-candidate');}return result;}
function render(){
  updateNavigation();
  let found=currentCatalogResults();
  $('#taxonomy-home').innerHTML=taxonomyHTML(state.kind,state.facets,entries);
  const facetsWereOpen=$('.advanced-filters')?.open||false;$('#facet-panel').innerHTML=facetsHTML(state.kind,state.facets);if($('.advanced-filters'))$('.advanced-filters').open=facetsWereOpen;
  $('#plant-link-banner').innerHTML=state.linkedAnimalId?`<div class="linked-animal-banner"><b>${escapeHTML(entries.find(e=>e.id===state.linkedAnimalId).name)}의 환경과 겹치는 식물 검토 후보</b><p>온습도 범위가 겹치고 독성 보고가 있는 항목은 제외한 목록입니다. 무게·파손·조명·환기·농약·섭취 안전성을 종별로 추가 검토해야 합니다.</p><button data-clear-animal-link>연동 조건 해제</button></div>`:'';
  if(state.sort==='name')found.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  if(state.sort==='easy')found.sort((a,b)=>['쉬움','보통','어려움','자료 확인'].indexOf(a.difficulty)-['쉬움','보통','어려움','자료 확인'].indexOf(b.difficulty));
  const page=paginate(found,state.page,state.pageSize);state.page=page.page;
  $('#result-count').innerHTML=`총 <strong>${found.length}</strong>개의 ${state.favoritesOnly?'즐겨찾기':'도감'} <span>· 저마다의 삶을 만나보세요</span>`;
  $('#cards').innerHTML=found.length?page.items.map(e=>`<article class="entry-card"><div class="card-photo ${e.kind}">${specimenImage(e)}<span class="photo-label" title="${e.photo?escapeHTML(e.photo.photographer+' · '+e.photo.license):'사진 확인 중'}">${e.image?'실제 촬영 사진':'사진 확인 중'}</span><span class="kind-badge">${icon(kindIcon(e.kind))}${kindLabels[e.kind]}</span><button class="favorite-button ${state.favorites.includes(e.id)?'saved':''}" data-favorite="${e.id}" aria-label="${escapeHTML(e.name)} 즐겨찾기" aria-pressed="${state.favorites.includes(e.id)}">${icon('heart')}</button><button class="photo-link" data-detail="${e.id}" aria-label="${escapeHTML(e.name)} 상세정보 보기"></button></div><div class="card-body"><div class="card-category">${escapeHTML(e.group)}<span class="difficulty ${e.difficulty==='쉬움'?'easy':''}"><i></i>${e.difficulty}</span></div><button class="card-title" data-detail="${e.id}">${escapeHTML(e.name)}${icon('arrow')}</button><p class="latin">${escapeHTML(e.latin)}</p><div class="entry-tags">${environmentTags(e).map(label=>`<span>${escapeHTML(label)}</span>`).join('')}</div><div class="card-metrics"><span>${icon('thermo')}${formatRange(e.temp,' °C')}</span><span>${icon('drop')}${formatRange(e.humidity,' %')}</span><span class="environment-tag">${e.environment}</span></div><button class="card-compare" data-compare-entry="${e.id}">${icon('compare')} 비교 대상으로 선택</button></div></article>`).join(''):`<div class="empty-state">${icon(state.favoritesOnly?'heart':'search')}<h3>${state.favoritesOnly?'아직 담아둔 생명이 없어요':'검색 결과가 없어요'}</h3><p>${state.favoritesOnly?'카드의 하트를 눌러 나만의 도감을 만들어 보세요.':'검색어를 바꾸거나 필터를 초기화해 보세요.'}</p><button class="button secondary" id="empty-reset">전체 도감 보기</button></div>`;
  $('#pagination').innerHTML=found.length?`<button data-page="${page.page-1}" ${page.page===1?'disabled':''} aria-label="이전 페이지">← 이전</button><span role="status">${page.page} / ${page.totalPages} 페이지 <small>· 총 ${page.total}개</small></span><label>한 번에 <select id="page-size" aria-label="페이지당 항목 수">${[24,48,96].map(n=>`<option ${n===page.pageSize?'selected':''}>${n}</option>`).join('')}</select>개</label><button data-page="${page.page+1}" ${page.page===page.totalPages?'disabled':''} aria-label="다음 페이지">다음 →</button>`:'';
  $('#page-size')?.addEventListener('change',event=>{state.pageSize=Number(event.target.value);state.page=1;render();});
  $('#clear-search').hidden=!state.query;
  document.querySelectorAll('.card-photo img,.card-photo image').forEach(img=>img.addEventListener('error',()=>{const card=img.closest('.card-photo');const id=card.querySelector('[data-detail]').dataset.detail;const e=entries.find(e=>e.id===id);(img.closest('svg')||img).outerHTML=specimenImage({...e,image:null,photoFailed:true});card.classList.add('image-unavailable');card.querySelector('.photo-label').textContent='사진 표시 실패';},{once:true}));
}
function navigate(kind){state.facets=emptyFacets();state.linkedAnimalId=null;state.favoritesOnly=kind==='favorites';state.kind=state.favoritesOnly?'all':kind;state.group='all';state.subgroup='all';state.page=1;updateGroups();render();const section=kind==='plant'||kind==='animal'||['reptile','amphibian','arthropod'].includes(kind)?$('#taxonomy-home'):$('#explore');section.scrollIntoView({behavior:'smooth',block:'start'});}
function reset(){state.facets=emptyFacets();state.linkedAnimalId=null;Object.assign(state,{kind:'all',query:'',group:'all',subgroup:'all',page:1,pageSize:24,difficulty:'all',environment:'all',favoritesOnly:false});$('#search').value='';$('#difficulty').value='all';$('#environment').value='all';updateGroups();render();}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),3000);}
function toggleFavorite(id){const focused=document.activeElement;state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];let saved=true;try{storage.setItem('viva-favorites',JSON.stringify(state.favorites));}catch{saved=false;}render();if(focused?.dataset.favorite===id&&!focused.closest('dialog'))document.querySelector(`.entry-card [data-favorite="${id}"]`)?.focus({preventScroll:true});const detailButton=document.querySelector('#detail-dialog [data-favorite]');if(detailButton){const isSaved=state.favorites.includes(detailButton.dataset.favorite);detailButton.setAttribute('aria-pressed',isSaved);detailButton.innerHTML=icon('heart')+(isSaved?' 즐겨찾기에서 해제':' 즐겨찾기 담기');}toast(saved?(state.favorites.includes(id)?'나의 즐겨찾기에 담았어요.':'즐겨찾기에서 지웠어요.'):'이 브라우저에서는 저장할 수 없어 이번 방문에만 유지됩니다.');}
function openDialog(dialog){lastFocus=document.activeElement;dialog.showModal();document.body.classList.add('modal-open');}
function closeDialog(dialog){dialog.close();document.body.classList.remove('modal-open');if(lastFocus?.isConnected)lastFocus.focus();}
function photoCredit(e){
 const p=e.photo;if(!p)return '';
 return `<section class="photo-credit"><h3>사진 출처</h3><a href="${escapeHTML(p.sourcePage)}" target="_blank" rel="noopener noreferrer">${escapeHTML(p.title)}</a><p>촬영자: ${escapeHTML(p.photographer)} · <a href="${escapeHTML(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(p.license)}</a></p>${p.attribution?`<p>${escapeHTML(p.attribution)}</p>`:''}${p.credit?`<p>원출처 크레딧: ${escapeHTML(p.credit)}</p>`:''}<small>원출처 식별 기준: ${escapeHTML(p.identificationBasis||'원자료의 학명 연결')}<br>변경 사항: ${escapeHTML(p.modifications||'없음')} · 카드에서는 표시 영역에 맞게 일부가 잘려 보일 수 있음 · 확인 ${escapeHTML(p.retrievedAt)}</small></section>`;
}
function recordSources(e){
 const source=sources.find(s=>s.id===e.evidenceId);
 return `<ul class="source-list"><li><a href="${escapeHTML(e.source)}" target="_blank" rel="noopener noreferrer">종별 분류·참고 자료 ↗</a></li>${source?`<li><a href="${source.url}/tree/${source.commit}" target="_blank" rel="noopener noreferrer">조사 원자료 · ${source.id} ↗</a><small>${source.retrievedAt} 확인 · ${escapeHTML(e.careBasis)}</small></li>`:''}${e.sourceRecord?`<li>식물 원자료 항목 ID: <code>${escapeHTML(e.sourceRecord)}</code><small>가이드 변환·요약 / Luminoid 원자료 · <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-NC-SA 4.0</a></small></li>`:''}</ul>${e.climateEvidence?`<div class="climate-evidence"><a href="${escapeHTML(e.climateEvidence.humidity.sourceUrl)}" target="_blank" rel="noopener noreferrer">습도 수치의 원문 출처 ↗</a><small>원자료 항목: ${escapeHTML(e.climateEvidence.humidity.recordId)} · ${escapeHTML(e.climateEvidence.humidity.statement)}</small></div>`:''}${e.plantSource?`<div class="climate-evidence"><a href="${escapeHTML(e.plantSource.sourceUrl)}" target="_blank" rel="noopener noreferrer">NC Extension · 성숙 크기·성장·번식 원자료 ↗</a><small>확인 ${escapeHTML(e.plantSource.reviewedAt)}</small></div>`:''}${photoCredit(e)}${e.regulation?`<p class="regulation-note">${escapeHTML(e.regulation)}</p>`:''}`;
}
function detail(id){
  const e=entries.find(e=>e.id===id),dialog=$('#detail-dialog');
  dialog.innerHTML=`<button class="dialog-close" data-close aria-label="상세정보 닫기">${icon('close')}</button><div class="detail-visual ${e.kind}">${specimenImage(e)}<span class="detail-image-caption">${e.image?'실제 촬영 사진 · 아래 촬영자·라이선스 확인':'종별 사진 수집 대기 · 학명과 출처로 확인하세요'}</span></div><div class="detail-content"><span class="section-eyebrow">${kindLabels[e.kind]} 도감 / ${escapeHTML(e.group)}</span><h2>${escapeHTML(e.name)}</h2><p class="detail-latin">${escapeHTML(e.latin)}</p><p class="detail-summary">${escapeHTML(e.summary)}</p><div class="evidence-badge"><b>${e.careBasis||'개별 관리 요약'}</b><span>자료 확인: ${e.reviewedAt||'2026-11-05'}</span></div><div class="detail-metrics"><div>${icon('thermo')}<small>${escapeHTML(e.tempLabel||'기본 온도')}</small><b>${formatRange(e.temp,' °C')}</b></div><div>${icon('drop')}<small>습도 범위</small><b>${e.humidity?formatRange(e.humidity,' %'):(e.humidityLabel||'확인 필요')}</b></div><div>${icon('leaf')}<small>관리 난이도</small><b>${e.difficulty}</b></div></div><dl class="detail-facts"><div><dt>세부 분류</dt><dd>${escapeHTML(e.subgroup||e.group)} ${e.family?'· '+escapeHTML(e.family):''}</dd></div>${e.origin?`<div><dt>분포 · 원산</dt><dd>${escapeHTML(formatOrigin(e.origin))}</dd></div>`:''}${e.aliases?.filter(Boolean).length?`<div><dt>검색 별칭</dt><dd>${escapeHTML(e.aliases.filter(Boolean).join(' / '))}</dd></div>`:''}${e.conservation?`<div><dt>보전 등급</dt><dd>${escapeHTML(e.conservation)} · 분류 자료 기준, 현행 규제 여부 아님</dd></div>`:''}${e.tradeRecords?`<div><dt>사육 기록</dt><dd>출처 연구의 생체·사육 원산 상업 거래 기록 ${e.tradeRecords}건 (1999–2021). 현재 사육 허가를 뜻하지 않습니다.</dd></div>`:''}<div><dt>환경</dt><dd>${e.environment}</dd></div><div><dt>빛 · 조명</dt><dd>${escapeHTML(e.light)}</dd></div><div><dt>크기 · 구조</dt><dd>${escapeHTML(e.size)}</dd></div></dl>${detailedFields(e)}<h3>건강하게 함께하는 방법</h3><ol class="care-list">${e.care.map(c=>`<li>${escapeHTML(c)}</li>`).join('')}</ol><div class="care-note"><b>기억해 주세요</b><p>${escapeHTML(e.caution)}</p></div><div class="record-sources"><h3>자료 출처</h3>${recordSources(e)}</div><p class="source-line">더 알아보기 <a href="${escapeHTML(e.source)}" target="_blank" rel="noopener noreferrer">관리 참고 자료 ↗</a> · 개체와 생육 단계에 따라 조절하세요.</p><div class="detail-actions"><button class="button secondary" data-favorite="${id}" aria-pressed="${state.favorites.includes(id)}">${icon('heart')} ${state.favorites.includes(id)?'즐겨찾기에서 해제':'즐겨찾기 담기'}</button><button class="button primary" data-compare-entry="${id}">환경 비교하기 ${icon('arrow')}</button></div></div>`;
  dialog.setAttribute('aria-label',`${escapeHTML(e.name)} 상세정보`);openDialog(dialog);
}
let comparison;
function openCompare(id,useResults=false){
 if($('#detail-dialog').open)closeDialog($('#detail-dialog'));
 const catalogResults=currentCatalogResults().filter(e=>e.kind!=='vivarium');
 const a=id||(useResults?catalogResults[0]?.id:null)||'fittonia';const b=a==='crested-gecko'?'fittonia':'crested-gecko';
 comparison={a:{selected:a,kind:'all',group:'all',query:'',resultsOnly:useResults,page:1},b:{selected:b,kind:'all',group:'all',query:'',resultsOnly:false,page:1},editing:'a',open:true,catalogResults};
 const dialog=$('#compare-dialog');
 dialog.innerHTML=`<button class="dialog-close" data-close aria-label="비교 닫기">${icon('close')}</button><span class="section-eyebrow">FIND A SHARED CLIMATE</span><h2>같은 환경을 좋아할까요?</h2><p class="dialog-intro">이름·학명으로 검색하거나 분류를 골라 두 생물을 선택하세요.</p><div id="compare-selected" class="compare-selected"></div><div id="compare-picker" class="compare-picker"></div><div id="compare-result" aria-live="polite"></div><div class="care-note"><b>환경 적합성 ≠ 합사 가능성</b><p>범위가 겹쳐도 안전한 합사를 의미하지 않습니다. 포식·독성·체격·활동성·질병 전파와 국소 가열, 환기, 건조 주기를 별도로 확인하세요.</p></div>`;
 dialog.onclick=event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.editSide){comparison.editing=button.dataset.editSide;comparison.open=true;renderComparisonPicker();$('#compare-search')?.focus();}
  if(button.dataset.pickSpecies){const side=comparison.editing;comparison[side].selected=button.dataset.pickSpecies;if(side==='a')comparison.editing='b';else comparison.open=false;renderComparisonPicker();renderComparison();if(comparison.open)$('#compare-search')?.focus();else document.querySelector('[data-edit-side="b"]')?.focus();}
  if(button.dataset.pickerPage){comparison[comparison.editing].page=Number(button.dataset.pickerPage);renderPickerResults();}
 };
 dialog.setAttribute('aria-label','환경 적합성 비교');renderComparisonPicker();renderComparison();openDialog(dialog);
}
function renderComparisonPicker(){
 $('#compare-selected').innerHTML=['a','b'].map((side,index)=>{const e=entries.find(e=>e.id===comparison[side].selected);return `<button class="selected-species ${comparison.open&&comparison.editing===side?'editing':''}" data-edit-side="${side}" aria-label="${index===0?'첫 번째':'두 번째'} 생물 선택 변경"><small>${index===0?'첫 번째':'두 번째'} 생물 · 검색해서 변경 ${icon('search')}</small><b>${escapeHTML(e.name)}</b><em>${escapeHTML(e.latin)} · ${kindLabels[e.kind]}</em></button>`;}).join('');
 if(!comparison.open){$('#compare-picker').innerHTML='';return;}
 const active=comparison[comparison.editing],label=comparison.editing==='a'?'첫 번째':'두 번째';
 $('#compare-picker').innerHTML=`<div class="picker-heading"><b>${label} 생물 찾기</b><small>검색 결과에서 선택하면 바로 반영됩니다</small></div><label class="picker-search">${icon('search')}<input id="compare-search" type="search" aria-label="${label} 생물 검색" placeholder="이름 또는 학명으로 검색" value="${escapeHTML(active.query)}" autocomplete="off"></label><div class="picker-filters"><label>분류<select id="compare-kind" aria-label="${label} 생물 분류"><option value="all">전체 생물</option>${Object.entries(kindLabels).filter(([k])=>k!=='vivarium').map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>세부 분류<select id="compare-group" aria-label="${label} 생물 세부 분류"></select></label><label class="picker-scope"><input id="compare-results-only" type="checkbox" ${active.resultsOnly?'checked':''}>현재 도감 검색 결과만 (${comparison.catalogResults.length}개)</label></div><div id="picker-results"></div>`;
 $('#compare-kind').value=active.kind;updatePickerGroups();
 $('#compare-search').addEventListener('input',event=>{active.query=event.target.value;active.page=1;renderPickerResults();});
 $('#compare-kind').addEventListener('change',event=>{active.kind=event.target.value;active.group='all';active.page=1;updatePickerGroups();renderPickerResults();});
 $('#compare-group').addEventListener('change',event=>{active.group=event.target.value;active.page=1;renderPickerResults();});
 $('#compare-results-only').addEventListener('change',event=>{active.resultsOnly=event.target.checked;active.group='all';active.page=1;updatePickerGroups();renderPickerResults();});
 renderPickerResults();
}
function updatePickerGroups(){const a=comparison[comparison.editing];const source=a.resultsOnly?comparison.catalogResults:entries;const groups=[...new Set(source.filter(e=>e.kind!=='vivarium'&&(a.kind==='all'||e.kind===a.kind)).map(e=>e.group))];$('#compare-group').replaceChildren(new Option('모든 세부 분류','all'),...groups.sort().map(g=>new Option(g,g)));$('#compare-group').value=a.group;}
function renderPickerResults(){
 const active=comparison[comparison.editing];const result=findComparisonOptions(entries,active,comparison.catalogResults);active.page=result.page;
 $('#picker-results').innerHTML=`<p class="picker-count" role="status">${result.total}개 검색 결과 · ${result.page} / ${result.pages} 페이지</p><ul class="picker-result-list">${result.items.map(e=>`<li><button data-pick-species="${e.id}" aria-label="선택: ${escapeHTML(e.name)}" aria-pressed="${e.id===active.selected}"><span>${kindLabels[e.kind]} · ${escapeHTML(e.group)}</span><b>${escapeHTML(e.name)}</b><small>${escapeHTML(e.latin)}</small></button></li>`).join('')}</ul>${result.total?'':'<p class="picker-empty">검색 결과가 없습니다. 검색어나 분류를 바꿔 주세요.</p>'}<div class="picker-pages"><button data-picker-page="${result.page-1}" ${result.page===1?'disabled':''} aria-label="비교 검색 이전 결과">← 이전</button><button data-picker-page="${result.page+1}" ${result.page===result.pages?'disabled':''} aria-label="비교 검색 다음 결과">다음 →</button></div>`;
}
function renderComparison(){
 const a=entries.find(e=>e.id===comparison.a.selected),b=entries.find(e=>e.id===comparison.b.selected),r=compareEnvironment(a,b);
 if(a.id===b.id){$('#compare-result').innerHTML='<div class="comparison-status">서로 다른 두 생물을 선택해 주세요.</div>';return;}
 const titles={overlap:'공통 온도·습도 범위가 있어요',different:'기본 환경 조건이 서로 달라요',insufficient:'자료가 부족해 적합성을 판단할 수 없어요'};
 const description=r.status==='insufficient'?'누락 또는 미검증 기본값: '+r.missing.join(' / '):r.compatible?'겹치는 구간을 출발점으로, 세부 관리 조건을 확인하세요.':'공통 범위가 없는 항목이 있어 별도 환경을 권장합니다.';
 const shared=(key,value,unit)=>!Array.isArray(a[key])||!Array.isArray(b[key])?'자료 없음':value?formatRange(value,unit):'없음';
 $('#compare-result').innerHTML=`<div class="comparison-status ${r.compatible?'match':'no-match'}">${icon(r.compatible?'check':'sliders')}<div><b>${titles[r.status]}</b><p>${escapeHTML(description)}</p></div></div><div class="compare-table-wrap"><table class="compare-table"><caption class="sr-only">온도와 습도 범위 비교</caption><thead><tr><th>관리 항목</th><th>${escapeHTML(a.name)}</th><th>${escapeHTML(b.name)}</th><th>공통 범위</th></tr></thead><tbody><tr><th>온도</th><td>${formatRange(a.temp,' °C')}</td><td>${formatRange(b.temp,' °C')}</td><td>${shared('temp',r.temperature,' °C')}</td></tr><tr><th>습도</th><td>${formatRange(a.humidity,' %')}</td><td>${formatRange(b.humidity,' %')}</td><td>${shared('humidity',r.humidity,' %')}</td></tr><tr><th>자료</th><td>${escapeHTML(a.careBasis)}</td><td>${escapeHTML(b.careBasis)}</td><td>출처 확인</td></tr></tbody></table></div><div class="compare-cautions"><p><b>${escapeHTML(a.name)}</b>${escapeHTML(a.caution)}</p><p><b>${escapeHTML(b.name)}</b>${escapeHTML(b.caution)}</p></div><details class="comparison-sources"><summary>두 생물의 환경 정보 출처</summary><h3>${escapeHTML(a.name)}</h3>${recordSources(a)}<h3>${escapeHTML(b.name)}</h3>${recordSources(b)}</details>`;
}
document.addEventListener('click',event=>{
  const target=event.target.closest('button,a');if(!target)return;
  if(target.matches('.brand,.footer-brand')){event.preventDefault();reset();window.scrollTo({top:0,behavior:'smooth'});}
  if(target.dataset.nav)navigate(target.dataset.nav);
  if(target.dataset.category)navigate(target.dataset.category);
  if(target.dataset.tab)navigate(target.dataset.tab);
  if(target.dataset.favorite)toggleFavorite(target.dataset.favorite);
  if(target.dataset.detail)detail(target.dataset.detail);
  if(target.dataset.reverseDetail){closeDialog($('#reverse-dialog'));detail(target.dataset.reverseDetail);}
  if(target.hasAttribute('data-open-reverse')){prepareReverse($('#reverse-dialog'),entries);openDialog($('#reverse-dialog'));}
  if(target.dataset.facetCategory){const family=target.dataset.facetFamily;if((family==='plant')!==(state.kind==='plant'))state.facets=emptyFacets();state.kind=family;state.group='all';state.subgroup='all';const key=target.dataset.facetCategory;state.facets.categories=state.facets.categories.includes(key)?state.facets.categories.filter(x=>x!==key):[...state.facets.categories,key];state.page=1;updateGroups();render();$('#explore').scrollIntoView({behavior:'smooth'});}
  if(target.hasAttribute('data-clear-facets')){state.facets=emptyFacets();state.page=1;render();}
  if(target.dataset.plantMatches){const id=target.dataset.plantMatches;closeDialog(target.closest('dialog'));reset();state.kind='plant';state.linkedAnimalId=id;updateGroups();render();$('#explore').scrollIntoView({behavior:'smooth'});}
  if(target.hasAttribute('data-clear-animal-link')){state.linkedAnimalId=null;render();}
  if(target.hasAttribute('data-close'))closeDialog(target.closest('dialog'));
  if(target.hasAttribute('data-open-compare'))openCompare(undefined,target.hasAttribute('data-use-results'));
  if(target.dataset.compareEntry)openCompare(target.dataset.compareEntry);
  if(target.dataset.page){state.page=Number(target.dataset.page);render();$('#cards').scrollIntoView({behavior:'smooth',block:'start'});}
  if(target.id==='sources-shortcut')$('#about-button').click();
  if(target.id==='reset-filters'||target.id==='empty-reset')reset();
  if(target.id==='clear-search'){state.query='';state.page=1;$('#search').value='';render();$('#search').focus();}
});
document.addEventListener('change',event=>{const input=event.target;if(!input.dataset.facet)return;const field=input.dataset.facet;state.facets[field]=input.checked?[...new Set([...state.facets[field],input.value])]:state.facets[field].filter(v=>v!==input.value);state.page=1;render();document.querySelector(`[data-facet="${field}"][value="${CSS.escape(input.value)}"]`)?.focus({preventScroll:true});});
$('.search-box').addEventListener('submit',event=>event.preventDefault());
$('#search').addEventListener('input',event=>{state.query=event.target.value;state.page=1;render();});
for(const key of ['group','subgroup','difficulty','environment','sort'])$('#'+key).addEventListener('change',event=>{state[key]=event.target.value;state.page=1;if(key==='group'){state.subgroup='all';updateSubgroups();}render();});
$('#explore-button').addEventListener('click',()=>{$('#explore').scrollIntoView({behavior:'smooth'});$('#search').focus({preventScroll:true});});
$('#about-button').addEventListener('click',()=>{const d=$('#about-dialog');d.innerHTML=`<button class="dialog-close" data-close aria-label="안내 닫기">${icon('close')}</button><span class="section-eyebrow">ABOUT THIS FIELD GUIDE</span><h2>호기심에서 시작하는 작은 자연.</h2><p>VIVA는 식물 ${catalogCounts.plant}종, 파충류 ${catalogCounts.reptile}종, 양서류 ${catalogCounts.amphibian}종, 등각류·절지류 ${catalogCounts.arthropod}종, 비바리움 ${catalogCounts.vivarium}유형의 자료를 수록합니다. 무늬 변이·유통명·아종을 별도 종으로 중복 집계하지 않습니다. 검색은 이름·학명·분류·환경을 지원하며 즐겨찾기는 현재 브라우저에만 저장됩니다.</p><h3>수록 기준과 검증 범위</h3><p>파충류는 취미 사육 후보 학명을 분류 스냅샷과 대조한 기초 자료, 양서류는 생체·사육 원산(C/F) 상업 거래 기록과 AmphibiaWeb 학명을 대조한 자료입니다. 거래 기록이나 과거 사육 사례는 현재 국내 사육·수입 허가를 의미하지 않습니다. 실제 도입 전에 종별 전문 자료와 현행 규정을 확인하세요.</p><p>식물은 종별 또는 대표 종에 연결한 속·품종군 재배 가이드, 등각류는 취미 사육자 합의 기본값, 거미는 공개 취미 가이드입니다. 데이터는 전문가의 종별 완전 감수를 뜻하지 않습니다. 없는 수치는 추정하지 않으며 미검증 기본값·결측치가 있으면 환경 비교를 확정하지 않습니다.</p><h3>인터넷 조사 자료</h3><ul class="source-list">${sources.map(s=>`<li><a href="${s.url}/tree/${s.commit}" target="_blank" rel="noopener noreferrer">${s.url.split('/').slice(-2).join('/')}</a><small>확인 ${s.retrievedAt} · ${s.license}</small></li>`).join('')}</ul><p>Plantfolio에서 파생한 식물 자료는 CC BY-NC-SA 4.0(저작자 표시·비영리·동일조건 변경허락)로 제공합니다. 등각류 데이터는 MIT 라이선스이며 상세 조건은 research/의 라이선스 문서에 있습니다. 명칭·요약·분류를 변환했고, 설명·사진·사이트 코드는 복제하지 않았습니다.</p><h3>메인 실제 사진 출처</h3><p><a href="${heroPhoto.sourcePage}" target="_blank" rel="noopener noreferrer">${escapeHTML(heroPhoto.title)}</a> · 촬영자 ${escapeHTML(heroPhoto.photographer)} · <a href="${heroPhoto.licenseUrl}" target="_blank" rel="noopener noreferrer">${heroPhoto.license}</a>. ${escapeHTML(heroPhoto.modifications)}. <a href="${heroPhoto.licenseEvidence}" target="_blank" rel="noopener noreferrer">이용 조건 확인 자료</a></p><h3>데이터와 사진</h3><p>관리 설명은 각 상세 화면에 연결한 원예·파충류 관리 자료를 참고해 독립적으로 작성했습니다. 온습도는 입문용 범위이며 종·아종·나이·건강 상태에 맞는 추가 조사가 필요합니다. 진료·번식·합사를 위한 지침이 아닙니다.</p><p>AI 생성 이미지는 사용하지 않습니다. 재사용 라이선스·촬영자·원문 페이지를 확인한 실제 사진만 등록합니다. 사진을 확보하지 못한 종은 사진 수집 대기 상태로 표시하며 다른 종의 사진으로 대신하지 않습니다. 사진이 등록되면 상세 화면에 촬영자·라이선스·변경 사항·출처를 함께 표시합니다.</p><h3>개인정보와 저장</h3><p>회원가입·추적 분석을 사용하지 않습니다. 즐겨찾기는 브라우저에만 저장되며 브라우저 데이터를 삭제하면 사라집니다. 이미지도 사이트에서 직접 제공하여 외부 사진 API가 필요하지 않습니다.</p>`;d.setAttribute('aria-label','도감 안내 및 자료 출처');openDialog(d);});
for(const d of document.querySelectorAll('dialog')){d.addEventListener('cancel',event=>{event.preventDefault();closeDialog(d);});d.addEventListener('click',event=>{if(event.target===d){const r=d.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog(d);}});}
document.addEventListener('keydown',event=>{if(event.key==='/'&&!document.querySelector('dialog[open]')&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();$('#search').focus();}});
updateGroups();render();
