
(function() {
  'use strict';
  const NS = window.NS = {views:{}, after:{}, state:null};
  const titles = NS.titles = {home:'Writing desk',editor:'Manuscript',map:'Novel map',practice:'Craft practice',readers:'Reader workshop',revision:'Revision desk',notebook:'Commonplace'};
  NS.id = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2,10);
  NS.esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iconAliases={edit:'pencil',close:'x',add:'plus',chevron:'chevron-right',note:'notebook-pen',notes:'notebook-pen',bookOpen:'book-open',trash2:'trash-2',branch:'git-branch',clock3:'clock-3',practice:'pen-tool',reader:'glasses',back:'chevron-left',forward:'chevron-right',folderOpen:'folder-open',chevronDown:'chevron-down',grid:'layout-grid',cloud:'hard-drive',checkCircle:'circle-check',lightbulb:'lightbulb',spark:'sparkles',bookOpenText:'book-open-text'};
  NS.icon=(name,size=18)=>{
    const icons=window.studioIcons||{};
    const n=iconAliases[name]||String(name||'circle').replace(/([a-z])([A-Z])/g,'$1-$2').toLowerCase();
    const w=Number(size)||18;
    return '<svg class="ns-icon" aria-hidden="true" width="'+w+'" height="'+w+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+(icons[n]||icons.feather||'')+'</svg>';
  };
  NS.book=()=>NS.state.books.find(b=>b.id===NS.state.activeBookId)||NS.state.books[0];
  NS.wordCount=t=>(String(t||'').trim().match(/\S+/g)||[]).length;
  NS.download=(name,body,mime='text/plain;charset=utf-8')=>{
    const url=URL.createObjectURL(body instanceof Blob?body:new Blob([body],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  };
  let toastTimer=0,previousFocus=null;
  NS.toast=(message)=>{const el=document.querySelector('#toast');el.textContent=message;el.classList.add('shown');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('shown'),3600);};
  NS.modal=(title,bodyHtml,footerHtml='')=>{
    const el=document.querySelector('#modal-frame');
    if(el.hidden)previousFocus=document.activeElement;
    document.querySelector('#modal-title').textContent=title;
    document.querySelector('#modal-body').innerHTML=bodyHtml;document.querySelector('#modal-foot').innerHTML=footerHtml;
    document.querySelector('#modal-foot').hidden=!footerHtml;el.hidden=false;document.body.classList.add('dialog-open');
    requestAnimationFrame(()=>{const target=el.querySelector('[autofocus], input:not([type="file"]):not([type="hidden"]):not(:disabled),textarea,select')||document.querySelector('#close-modal');target?.focus({preventScroll:true});});
  };
  NS.closeModal=()=>{const el=document.querySelector('#modal-frame');if(el.hidden)return;el.hidden=true;document.body.classList.remove('dialog-open');document.querySelector('#modal-body').replaceChildren();document.querySelector('#modal-foot').replaceChildren();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});previousFocus=null;};
  NS.setMenu=(open)=>{document.body.classList.toggle('nav-open',open);document.querySelector('#drawer-shade').hidden=!open;document.querySelector('.mobile-menu').setAttribute('aria-expanded',String(open));};
  NS.status=()=>{const a=document.querySelector('#save-status');const st=NS.storageStatus;const failed=st&&['error','conflict','unavailable','full'].includes(st.kind);
    a.innerHTML=NS.icon(failed?'triangle-alert':'hard-drive',15)+'<span>'+NS.esc(failed?'Check local storage':'Local workspace')+'</span>';a.title=st?.message||'Manuscripts and practice are saved in this browser';};
  NS.save=()=>{const ok=NS.persistWorkspace();NS.status();return ok;};
  NS.render=()=>{const view=titles[NS.state.activeView]?NS.state.activeView:'home';document.body.dataset.view=view;
    document.title=titles[view]+' · Novel Studio';document.querySelector('#crumb-view').textContent=titles[view];
    if(NS.renderRail)NS.renderRail();const root=document.querySelector('#main');root.innerHTML=NS.views[view]();
    NS.status();NS.after[view]?.();};
  NS.go=(view)=>{if(!titles[view])return;NS.closeModal();NS.setMenu(false);document.documentElement.classList.remove('quiet');document.body.classList.remove('quiet','focus-mode');NS.state.activeView=view;NS.save();NS.render();window.scrollTo(0,0);document.querySelector('#main').focus({preventScroll:true});};
  document.addEventListener('click',e=>{const el=e.target.closest('[data-shell]');if(el){switch(el.dataset.shell){case'menu':NS.setMenu(!document.body.classList.contains('nav-open'));break;case'settings':NS.settings();break;case'books':NS.switchBook();break;case'new':NS.newBook();break;case'edit-book':NS.editBook();break;}}const view=e.target.closest('[data-page]');if(view)NS.go(view.dataset.page);
    if(e.target.id==='drawer-shade')NS.setMenu(false);if(e.target.id==='modal-frame'||e.target.closest('#close-modal'))NS.closeModal();
  });
  document.addEventListener('keydown',e=>{const frame=document.querySelector('#modal-frame');if(e.key==='Escape'){if(!frame.hidden)NS.closeModal();else NS.setMenu(false);}
    if(!frame.hidden&&e.key==='Tab'){const els=[...frame.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[href],[tabindex="0"]')].filter(a=>a.getClientRects().length);if(!els.length)return;if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0].focus();}}
  });
})();

