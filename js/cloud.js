js = r'''/*!
 * Maya's Secret Business OS v5.0
 * Cloud Adapter
 * File: js/cloud.js
 */

(function(window){
"use strict";

const API=window.BusinessAPI||{};
const Cloud={};

function ok(data){return {success:true,...data};}
function fail(err){return {success:false,message:err?.message||String(err)};}

Cloud.getProducts=async()=>API.getProducts();
Cloud.loadProducts=Cloud.getProducts;

Cloud.saveProduct=async(product)=>{
  await API.saveProduct(product);
  return ok({products:await API.getProducts()});
};

Cloud.upsertProduct=Cloud.saveProduct;

Cloud.deleteProduct=async(id)=>{
  await API.deleteProduct(id);
  return ok({products:await API.getProducts()});
};

Cloud.removeProduct=Cloud.deleteProduct;

Cloud.getOrders=()=>API.getOrders();
Cloud.loadOrders=Cloud.getOrders;

Cloud.saveOrder=async(order)=>{
  await API.saveOrder(order);
  return ok({orders:await API.getOrders()});
};

Cloud.updateOrder=async(order)=>{
  await API.updateOrder(order);
  return ok({orders:await API.getOrders()});
};

Cloud.getBookings=()=>API.getBookings();
Cloud.getSpaBookings=Cloud.getBookings;
Cloud.loadBookings=Cloud.getBookings;

Cloud.saveBooking=async(booking)=>{
  await API.saveBooking(booking);
  return ok({bookings:await API.getBookings()});
};

Cloud.updateBooking=async(booking)=>{
  await API.updateBooking(booking);
  return ok({bookings:await API.getBookings()});
};

Cloud.deleteBooking=async(id)=>{
  await API.deleteBooking(id);
  return ok({bookings:await API.getBookings()});
};

Cloud.getCustomers=()=>API.getCustomers();

Cloud.getSettings=()=>API.getSettings();
Cloud.loadSettings=Cloud.getSettings;

Cloud.saveSettings=async(settings)=>{
  await API.saveSettings(settings);
  return ok({settings:await API.getSettings()});
};

Cloud.dashboard=()=>API.getDashboard();
Cloud.salesReport=(f)=>API.getSalesReport(f);
Cloud.commissionReport=(f)=>API.getCommissionReport(f);

Cloud.exportBackup=()=>API.exportBackup();
Cloud.importBackup=(b)=>API.importBackup(b);

Cloud.sync=()=>API.sync();
Cloud.publishCatalogue=()=>API.publishCatalogue();

Cloud.uploadImage=(file)=>API.uploadImage(file);

Cloud.writeLog=(entry)=>API.writeLog(entry);
Cloud.getLogs=()=>API.getLogs();

Cloud.health=async()=>{
 try{
   await API.health();
   return ok({status:"online"});
 }catch(e){
   return fail(e);
 }
};

window.MayaCloud=Cloud;
window.MAYA_CLOUD=Cloud;
window.BusinessCloud=Cloud;

})(window);
