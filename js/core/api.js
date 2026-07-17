(function(window){
"use strict";

const Utils=window.BusinessUtils||window.MayaUtils;
const Config=window.BusinessConfig?.get?.()||{};

const API={};

const defaults={
 timeout:Config.api?.timeout||30000,
 retries:Config.api?.retries||3
};

function url(){
 return window.BusinessConfig?.getAppsScriptUrl?.()||
        Config.api?.appsScriptUrl||
        "";
}

async function request(action,payload={},method="POST"){
 const endpoint=url();

 if(!endpoint){
    throw new Error("Google Apps Script URL has not been configured.");
 }

 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),defaults.timeout);

 try{

   const response=await fetch(endpoint,{
      method,
      headers:{
        "Content-Type":"application/json"
      },
      body:method==="GET"?undefined:JSON.stringify({
        action,
        ...payload
      }),
      signal:controller.signal
   });

   clearTimeout(timer);

   if(!response.ok){
      throw new Error("Cloud request failed.");
   }

   const data=await response.json();

   if(data.success===false){
      throw new Error(data.message||"Operation failed.");
   }

   return data;

 }catch(err){
    clearTimeout(timer);
    throw err;
 }

}

async function retry(action,payload){
 let last;

 for(let i=0;i<defaults.retries;i++){
    try{
      return await request(action,payload);
    }catch(e){
      last=e;
      await new Promise(r=>setTimeout(r,(i+1)*500));
    }
 }

 throw last;
}

/* ---------- Health ---------- */

API.health=()=>retry("health");

API.ping=()=>retry("ping");

/* ---------- Products ---------- */

API.getProducts=()=>retry("getProducts");

API.saveProduct=(product)=>retry("saveProduct",{product});

API.updateProduct=(product)=>retry("updateProduct",{product});

API.deleteProduct=(id)=>retry("deleteProduct",{id});

/* ---------- Orders ---------- */

API.getOrders=()=>retry("getOrders");

API.saveOrder=(order)=>retry("saveOrder",{order});

API.updateOrder=(order)=>retry("updateOrder",{order});

API.updateOrderStatus=(id,status)=>retry("updateOrderStatus",{id,status});

/* ---------- Spa ---------- */

API.getBookings=()=>retry("getBookings");

API.saveBooking=(booking)=>retry("saveBooking",{booking});

API.updateBooking=(booking)=>retry("updateBooking",{booking});

API.deleteBooking=(id)=>retry("deleteBooking",{id});

/* ---------- Customers ---------- */

API.getCustomers=()=>retry("getCustomers");

API.saveCustomer=(customer)=>retry("saveCustomer",{customer});

/* ---------- Reports ---------- */

API.getDashboard=()=>retry("dashboard");

API.getSalesReport=(filters={})=>retry("salesReport",filters);

API.getCommissionReport=(filters={})=>retry("commissionReport",filters);

/* ---------- Settings ---------- */

API.getSettings=()=>retry("getSettings");

API.saveSettings=(settings)=>retry("saveSettings",{settings});

/* ---------- Logs ---------- */

API.getLogs=()=>retry("getLogs");

API.writeLog=(entry)=>retry("writeLog",{entry});

/* ---------- Images ---------- */

API.uploadImage=async(file){

 if(!(file instanceof File))
    throw new Error("Invalid image.");

 if(Utils?.fileToDataUrl){
    const data=await Utils.fileToDataUrl(file);

    return retry("uploadImage",{
       filename:file.name,
       mime:file.type,
       data
    });
 }

 throw new Error("File helper unavailable.");

};

/* ---------- Backup ---------- */

API.exportBackup=()=>retry("exportBackup");

API.importBackup=(backup)=>retry("importBackup",{backup});

/* ---------- Sync ---------- */

API.publishCatalogue=()=>retry("publishCatalogue");

API.sync=()=>retry("sync");

/* ---------- Generic ---------- */

API.call=(action,data={})=>retry(action,data);

API.setEndpoint=(endpoint)=>{
 window.BusinessConfig?.setAppsScriptUrl?.(endpoint);
};

API.getEndpoint=()=>url();

window.BusinessAPI=API;
window.MayaAPI=API;

})(window);
