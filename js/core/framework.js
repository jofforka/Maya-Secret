(function(window, document){
"use strict";

const Config = window.BusinessConfig;
const Utils = window.BusinessUtils || window.MayaUtils;
const UI = window.BusinessUI || window.MayaUI;
const Auth = window.BusinessAuth || window.MayaAuth;
const API = window.BusinessAPI || window.MayaAPI;

const Framework = {
  version: "5.0.0",
  state: {
    initialized:false,
    online:navigator.onLine,
    currentView:"dashboard",
    data:{}
  }
};

function emit(name,detail={}){
  document.dispatchEvent(new CustomEvent(name,{detail,bubbles:true}));
}

Framework.init = async function(){

  if(this.state.initialized) return this;

  this.state.initialized = true;

  UI?.init?.();
  Auth?.init?.();

  if(!Auth?.isAuthenticated?.()){
    emit("framework:ready",{authenticated:false});
    return this;
  }

  bindRouting();
  bindConnectivity();
  bindRefreshButtons();

  await this.bootstrap();

  emit("framework:ready",{authenticated:true});

  return this;
};

Framework.bootstrap = async function(){

  try{

    UI?.loading?.(true,"Loading Business OS...");

    const results = await Promise.allSettled([
      API?.getDashboard?.(),
      API?.getProducts?.(),
      API?.getOrders?.(),
      API?.getBookings?.(),
      API?.getCustomers?.(),
      API?.getSettings?.()
    ]);

    this.state.data.dashboard = value(results[0]);
    this.state.data.products  = value(results[1],[]);
    this.state.data.orders    = value(results[2],[]);
    this.state.data.bookings  = value(results[3],[]);
    this.state.data.customers = value(results[4],[]);
    this.state.data.settings  = value(results[5],{});

    updateDashboard();

    UI?.toast?.("Business OS ready.","success");

  }catch(e){
    console.error(e);
    UI?.toast?.(e.message || "Unable to load dashboard.","error");
  }finally{
    UI?.loading?.(false);
  }

};

function value(result,fallback=null){
  return result && result.status==="fulfilled" ? result.value : fallback;
}

function updateDashboard(){

  const d = Framework.state.data.dashboard || {};

  set("[data-dashboard-sales]",d.sales);
  set("[data-dashboard-orders]",d.orders);
  set("[data-dashboard-customers]",d.customers);
  set("[data-dashboard-bookings]",d.bookings);
  set("[data-dashboard-revenue]",
      Utils?.money ? Utils.money(d.revenue||0) : d.revenue||0);
}

function set(selector,val){
  const el=document.querySelector(selector);
  if(el) el.textContent = val ?? "0";
}

function bindRouting(){

  document.addEventListener("admin:viewChanged",e=>{
    Framework.state.currentView=e.detail.view;
    location.hash=e.detail.view;
  });

  window.addEventListener("hashchange",()=>{
    const view=location.hash.replace("#","") || "dashboard";
    UI?.showView?.(view);
  });

  const initial=location.hash.replace("#","");
  if(initial){
    UI?.showView?.(initial);
  }

}

function bindConnectivity(){

  function refresh(){
    Framework.state.online=navigator.onLine;

    UI?.updateCloudStatus?.(
      navigator.onLine?"online":"offline",
      navigator.onLine?"Connected":"Offline"
    );
  }

  refresh();

  window.addEventListener("online",refresh);
  window.addEventListener("offline",refresh);

}

function bindRefreshButtons(){

  document.querySelectorAll("[data-refresh]").forEach(btn=>{
    btn.addEventListener("click",()=>Framework.refresh());
  });

}

Framework.refresh = async function(){
  if(!Auth?.requireAuth?.()) return;

  UI?.loading?.(true,"Refreshing...");
  try{
    await this.bootstrap();
  }finally{
    UI?.loading?.(false);
  }
};

Framework.sync = async function(){
  if(!API?.sync) return;
  UI?.loading?.(true,"Synchronising...");
  try{
    await API.sync();
    UI?.toast?.("Cloud synchronisation complete.","success");
  }catch(e){
    UI?.toast?.(e.message,"error");
  }finally{
    UI?.loading?.(false);
  }
};

Framework.logout=function(){
  Auth?.logout?.();
};

Framework.getState=function(){
  return structuredClone ? structuredClone(this.state) : JSON.parse(JSON.stringify(this.state));
};

window.BusinessFramework=Framework;
window.MayaFramework=Framework;

document.addEventListener("maya:auth:signed-in",()=>Framework.bootstrap());

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",()=>Framework.init(),{once:true});
}else{
  Framework.init();
}

})(window,document);
