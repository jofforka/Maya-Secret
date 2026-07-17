(function(window, document){
"use strict";

const U = window.BusinessUtils || window.MayaUtils;
const CFG = window.BusinessConfig?.get?.() || {};
const UI = {};

let toastEl=null, overlay=null, loader=null;

function $(s,r=document){return (U&&U.query)?U.query(s,r):r.querySelector(s)}
function $$(s,r=document){return (U&&U.queryAll)?U.queryAll(s,r):Array.from(r.querySelectorAll(s))}

UI.init=function(){
  setupSidebar();
  setupViews();
  setupPasswordToggle();
  createToast();
  createLoader();
  createOverlay();
  bindGlobal();
};

function bindGlobal(){
  window.addEventListener("resize", closeSidebarDesktop);
}

function closeSidebarDesktop(){
  if(window.innerWidth>(CFG.ui?.mobileBreakpoint||900)){
    document.body.classList.remove("admin-sidebar-open");
    $(".admin-sidebar")?.classList.remove("open");
    overlay?.setAttribute("hidden","");
  }
}

function setupSidebar(){
  const sidebar=$(".admin-sidebar");
  const openBtn=$(".admin-mobile-menu");
  const closeBtn=$(".admin-sidebar-toggle");

  openBtn?.addEventListener("click",()=>{
    sidebar?.classList.add("open");
    document.body.classList.add("admin-sidebar-open");
    overlay?.removeAttribute("hidden");
  });

  closeBtn?.addEventListener("click",UI.closeSidebar);

  overlay?.addEventListener("click",UI.closeSidebar);

  $$(".admin-nav button,[data-admin-view-link]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const view=btn.dataset.adminView||btn.dataset.adminViewLink||btn.dataset.adminSection;
      if(view) UI.showView(view);

      if(window.innerWidth<=(CFG.ui?.mobileBreakpoint||900))
        UI.closeSidebar();
    });
  });
}

UI.closeSidebar=function(){
  $(".admin-sidebar")?.classList.remove("open");
  document.body.classList.remove("admin-sidebar-open");
  overlay?.setAttribute("hidden","");
};

function setupViews(){
  const first=$(".admin-view.active")||$(".admin-view");
  if(first) UI.showView(first.id||first.dataset.adminView||"dashboard");
}

UI.showView=function(name){
  $$(".admin-view").forEach(v=>v.classList.remove("active"));

  const target=
      document.getElementById(name) ||
      $(`.admin-view[data-admin-view="${name}"]`);

  if(target) target.classList.add("active");

  $$(".admin-nav button,[data-admin-view-link]").forEach(b=>{
      const active=(b.dataset.adminView===name||
                    b.dataset.adminViewLink===name||
                    b.dataset.adminSection===name);
      b.classList.toggle("active",active);
  });

  document.dispatchEvent(new CustomEvent("admin:viewChanged",{detail:{view:name}}));
};

function setupPasswordToggle(){
  $$("[data-password-toggle]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const input=btn.closest(".password-field")?.querySelector("input");
      if(!input)return;
      input.type=input.type==="password"?"text":"password";
      btn.textContent=input.type==="password"?"Show":"Hide";
    });
  });
}

function createToast(){
  toastEl=document.querySelector(".admin-toast");
  if(toastEl)return;

  toastEl=document.createElement("div");
  toastEl.className="admin-toast";
  document.body.appendChild(toastEl);
}

UI.toast=function(message,type="info",duration){
  createToast();
  toastEl.textContent=message;
  toastEl.dataset.type=type;
  toastEl.classList.add("show");

  clearTimeout(UI._toastTimer);
  UI._toastTimer=setTimeout(()=>{
    toastEl.classList.remove("show");
  },duration||CFG.ui?.toastDuration||3500);
};

function createLoader(){
  loader=document.querySelector(".global-loader");
  if(loader)return;

  loader=document.createElement("div");
  loader.className="global-loader";
  loader.innerHTML='<div class="spinner"></div><strong>Loading...</strong>';
  document.body.appendChild(loader);
}

UI.loading=function(show=true,text="Loading..."){
  createLoader();
  loader.querySelector("strong").textContent=text;
  loader.classList.toggle("is-active",show);
};

function createOverlay(){
  overlay=document.querySelector(".admin-overlay");
  if(overlay)return;
  overlay=document.createElement("div");
  overlay.className="admin-overlay";
  overlay.hidden=true;
  document.body.appendChild(overlay);
}

UI.confirm=function(message){
  return Promise.resolve(window.confirm(message));
};

UI.alert=function(message){
  window.alert(message);
};

UI.updateCloudStatus=function(state,label){
  $$(".cloud-status,.cloud-indicator").forEach(el=>{
      el.dataset.state=state;
      const txt=el.querySelector("small,span:last-child");
      if(txt && label) txt.textContent=label;
  });
};

UI.setTitle=function(title,subtitle){
  const h=$(".admin-topbar-main h1");
  const s=$(".admin-subtitle");
  if(h)h.textContent=title;
  if(s && subtitle!==undefined)s.textContent=subtitle;
};

UI.modal={
 open(id){
   const m=document.getElementById(id);
   if(!m)return;
   m.hidden=false;
   m.classList.add("open");
 },
 close(id){
   const m=document.getElementById(id);
   if(!m)return;
   m.hidden=true;
   m.classList.remove("open");
 }
};

document.addEventListener("click",e=>{
  const close=e.target.closest("[data-close-modal]");
  if(close){
    const modal=close.closest(".modal,[role='dialog']");
    if(modal){
      modal.hidden=true;
      modal.classList.remove("open");
    }
  }
});

window.BusinessUI=UI;
window.MayaUI=UI;

document.addEventListener("DOMContentLoaded",UI.init);

})(window,document);
