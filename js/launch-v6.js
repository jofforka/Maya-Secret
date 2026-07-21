(function(){
'use strict';
const rewards={
  GLOW10:{percent:10,label:'10% launch reward',source:'Home'},
  SECRET15:{percent:15,label:'15% beauty reward',source:'Shop'},
  SPA20:{percent:20,label:'20% secret reward',source:'Spa'},
  MAYAVIP25:{percent:25,label:'25% VIP reward',source:'Contact'}
};
function clean(v){return String(v||'').trim().toUpperCase().replace(/\s+/g,'');}
window.MayaLaunch=Object.freeze({version:'7.0.0',rewards,find(code){return rewards[clean(code)]||null;},clean});
document.addEventListener('click',function(e){
 const copy=e.target.closest('[data-copy-reward]'); if(!copy)return;
 const code=copy.getAttribute('data-copy-reward');
 navigator.clipboard?.writeText(code).then(()=>{copy.textContent='Code copied';setTimeout(()=>copy.textContent='Copy code',1800)}).catch(()=>{});
});
const badge=document.createElement('span');badge.className='launch-edition-badge';badge.textContent='v7.0 Stabilized';document.body.appendChild(badge);
})();
