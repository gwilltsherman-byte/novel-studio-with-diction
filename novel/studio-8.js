
(function(){
  'use strict';
  const ns=window.NS,icon=ns.icon,e=ns.esc;
  const groups=[['Workspace',[['home','layout-grid'],['editor','book-open-text'],['map','git-branch'],['revision','list-checks']]],['Workshop',[['practice','pen-tool'],['readers','glasses'],['notebook','notebook-text']]]];
  const craft=[
    {id:'distance',title:'Narrative distance',desc:'Move the reader closer to a character, then pull back.',color:'plum',kind:'Point of view'},
    {id:'cadence',title:'Sentence cadence',desc:'Change where a sentence lands and what lingers.',color:'clay',kind:'Style & rhythm'},
    {id:'payoff',title:'Setup & payoff',desc:'Plant a detail that changes meaning when it returns.',color:'sage',kind:'Novel structure'}
  ];
  function craftArt(id){
    if(id==='distance')return '<svg aria-hidden="true" viewBox="0 0 56 42" fill="none"><g stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22c5-4 12-10 22-10s19 6 25 10c-7 5-14 10-25 10S8 25 4 22z"/><circle cx="27" cy="22" r="8.7"/><circle cx="27" cy="22" r="3.2"/><path d="M7 15c6-5 12-8 20-8m6 1c7 1 12 4 16 7M8 30l4 2m4 2 5 1"/></g></svg>';
    if(id==='cadence')return '<svg aria-hidden="true" viewBox="0 0 56 42" fill="none"><g stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M3 13c8 0 8 11 15 11s7-17 14-17 8 12 16 12h5M3 21c8 0 8 11 15 11s7-17 14-17 8 12 16 12h5M3 29c8 0 8 9 15 9s7-15 14-15 8 12 16 12h5"/></g></svg>';
    return '<svg aria-hidden="true" viewBox="0 0 56 42" fill="none"><g stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M9 34V18l1-1m-1 9C4 24 3 21 3 18c5 0 7 3 6 8zm0-6c1-5 4-7 8-8 0 4-2 7-8 8zM35 34V12m0 12c-8 0-11-5-12-12 8 1 12 5 12 12zm0-7c2-7 6-11 14-12-1 8-6 12-14 12zm0 14c3-6 7-8 15-8-3 6-7 9-15 8zM3 35h13m12 0h18"/></g></svg>';
  }
  ns.renderRail=()=>{
    const book=ns.book(), view=ns.state.activeView;
    const parts=groups.map(([label,items])=>'<div class="rail-group"><h2>'+label+'</h2><nav aria-label="'+label+'">'+items.map(([key,ico])=>'<button data-page="'+key+'" class="rail-link'+(key===view?' selected':'')+'" '+(key===view?'aria-current="page"':'')+'>'+icon(ico,19)+'<span>'+ns.titles[key]+'</span></button>').join('')+'</nav></div>').join('');
    document.querySelector('#rail').innerHTML='<button class="brand" data-page="home" aria-label="Novel Studio writing desk"><img alt="" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCI+PHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMTAiIGZpbGw9IiMyNzNkMzIiLz48ZyBmaWxsPSJub25lIiBzdHJva2U9IiNlNWVhZDIiIHN0cm9rZS13aWR0aD0iMS45IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik04IDI5YzUtMSAxMSAwIDE2IDQgNS00IDExLTUgMTYtNHY0Yy02IDAtMTAgMS0xNiA1LTYtNC0xMC01LTE2LTV6Ii8+PHBhdGggZD0iTTE2IDI4bDgtMTBtLTQgNmMtMy05IDUtMTQgMTUtMTYtMSAxMS02IDE3LTE1IDE2em0zLTQgNi02Ii8+PC9nPjwvc3ZnPgo="><span>Novel Studio</span></button><button class="book-switch" data-shell="books"><span class="book-tile">'+icon('book-marked',17)+'</span><span class="book-switch-text"><small>Current manuscript</small><strong>'+e(book.title)+'</strong></span>'+icon('chevrons-up-down',14)+'</button>'+parts+'<div class="rail-bottom"><button data-shell="settings" class="rail-link">'+icon('settings-2',18)+'<span>Workspace settings</span></button><div class="rail-sign"><span class="studio-monogram">N<span>S</span></span><span><b>Personal studio</b><small>Private workspace</small></span></div></div>';
  };
  ns.views.home=()=>{
    const b=ns.book(),chapter=b.chapters.find(c=>c.id===b.activeChapterId)||b.chapters[0],words=b.chapters.reduce((n,c)=>n+ns.wordCount(c.text),0);
    const date=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(new Date());
    const sample=b.isSample?' <span class="hero-sep">/</span> Sample manuscript':'';
    const rec=ns.practiceRecommendation?.();
    const chapters=b.chapters.slice(0,4).map((c,i)=>'<button class="chapter-row" data-home-chapter="'+e(c.id)+'"><span class="chapter-icon">'+icon('file-text',19)+'</span><span><strong>'+e(c.title||'Untitled chapter')+'</strong><small>Chapter '+(i+1)+(c.pov?' · '+e(c.pov):'')+'</small></span><span class="chapter-words">'+ns.wordCount(c.text).toLocaleString()+' words</span>'+icon('chevron-right',15)+'</button>').join('');
    const cards=craft.map(c=>'<button class="craft-card '+c.color+'" data-home-practice="'+c.id+'"><span class="craft-art">'+craftArt(c.id)+'</span><span class="craft-type">'+c.kind+'</span><strong>'+c.title+'</strong><span class="craft-description">'+c.desc+'</span></button>').join('');
    return '<div class="desk"><header class="desk-heading"><div><span class="desk-date">'+e(date)+'</span><h1>Writing desk</h1></div><button class="btn secondary new-manuscript" data-shell="new">'+icon('plus',16)+'New manuscript</button></header>'+
      '<section class="desk-hero" aria-label="Current manuscript"><div class="hero-copy"><div class="hero-kicker"><span></span> Current manuscript</div><h2>'+e(b.title)+'</h2><p class="hero-meta">'+e(b.genre||'Fiction')+' <span class="hero-sep">/</span> '+b.chapters.length+' '+(b.chapters.length===1?'chapter':'chapters')+sample+'</p><button class="btn primary" data-home-continue>'+icon('book-open',17)+(words?'Continue writing':'Start writing')+'</button></div></section>'+
      (rec?.kind==='transfer'?'<button class="due-banner" data-home-due>'+icon('calendar-check')+'Return to a practice from an earlier session <b>Open exercise</b></button>':'')+
      '<section class="desk-section"><header class="section-head"><h2>Craft practice</h2><button class="text-btn" data-page="practice">Browse practice '+icon('chevron-right',15)+'</button></header><div class="craft-grid">'+cards+'</div></section>'+
      '<section class="desk-section"><header class="section-head"><h2>In your manuscript</h2><button class="text-btn" data-page="map">Open novel map '+icon('chevron-right',15)+'</button></header><div class="chapter-shelf">'+chapters+'</div></section>'+
      '<div class="desk-foot">'+icon('book-open',15)+'<span>'+words.toLocaleString()+' words in this manuscript</span><button class="text-btn" data-shell="books">Switch manuscript</button></div></div>';
  };
  document.addEventListener('click',ev=>{let b=ev.target.closest('[data-home-practice]');if(b){ns.openPractice(ns.book().activeChapterId,b.dataset.homePractice);return;}b=ev.target.closest('[data-home-chapter]');if(b){ns.openChapter(b.dataset.homeChapter);return;}if(ev.target.closest('[data-home-continue]'))ns.go('editor');if(ev.target.closest('[data-home-due]'))ns.openPractice();});
  ns.state=ns.loadWorkspace();
  document.querySelector('.mobile-menu').innerHTML=icon('menu',22);document.querySelector('#close-modal').innerHTML=icon('x',19);document.querySelector('.crumb-icon').innerHTML=icon('panel-left',15);
  ns.render();
})();

