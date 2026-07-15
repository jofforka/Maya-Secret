(()=>{
const money=n=>'₦'+Number(n).toLocaleString('en-NG');
const services=[
{id:'swedish',category:'massage',categoryName:'Massage Therapy',name:'Swedish Massage',price:20000,duration:60,desc:'Gentle, flowing movements for relaxation and whole-body ease.'},
{id:'aromatherapy',category:'massage',categoryName:'Massage Therapy',name:'Aromatherapy Massage',price:20000,duration:60,desc:'A calming massage experience paired with aromatic oils.'},
{id:'cupping',category:'massage',categoryName:'Massage Therapy',name:'Cupping Massage',price:35000,duration:75,desc:'Targeted massage and cupping for areas of muscular tension.'},
{id:'deep-tissue',category:'massage',categoryName:'Massage Therapy',name:'Deep Tissue Massage',price:35000,duration:90,desc:'Focused pressure for deeper muscular tension and recovery.'},
{id:'hot-stone',category:'massage',categoryName:'Massage Therapy',name:'Hot Stone Massage',price:35000,duration:90,desc:'Warm-stone therapy designed for deep relaxation.'},
{id:'bb-glow',category:'facials',categoryName:'Facial Treatments',name:'BB Glow Facial',price:35000,duration:75,desc:'A professional facial focused on a luminous, refreshed appearance.'},
{id:'dermaplaning',category:'facials',categoryName:'Facial Treatments',name:'Dermaplaning Facial',price:15000,duration:45,desc:'Professional exfoliating facial treatment for smoother-looking skin.'},
{id:'ayurvedic',category:'facials',categoryName:'Facial Treatments',name:'Ayurvedic Facial',price:30000,duration:60,desc:'A restorative facial inspired by Ayurvedic care rituals.'},
{id:'hydra',category:'facials',categoryName:'Facial Treatments',name:'Hydra Facial',price:20000,duration:60,desc:'A hydration-focused cleansing and refreshing facial.'},
{id:'prp',category:'facials',categoryName:'Facial Treatments',name:'PRP Facial',price:50000,duration:90,desc:'Specialist facial service; consultation is required.'},
{id:'brazilian',category:'waxing',categoryName:'Waxing Services',name:'Brazilian Wax',price:20000,duration:45,desc:'Professional Brazilian waxing service.'},
{id:'bikini',category:'waxing',categoryName:'Waxing Services',name:'Bikini Wax',price:15000,duration:30,desc:'Professional bikini-line waxing service.'},
{id:'underarm',category:'waxing',categoryName:'Waxing Services',name:'Underarm Wax',price:10000,duration:20,desc:'Clean and efficient underarm waxing.'},
{id:'legs',category:'waxing',categoryName:'Waxing Services',name:'Leg Wax',price:18000,duration:45,desc:'Smooth professional leg waxing.'},
{id:'chin',category:'waxing',categoryName:'Waxing Services',name:'Chin Wax',price:10000,duration:15,desc:'Precise facial waxing for the chin area.'},
{id:'full-body-wax',category:'waxing',categoryName:'Waxing Services',name:'Full Body Wax',price:50000,duration:120,desc:'A complete professional waxing service.'},
{id:'body-polish',category:'body',categoryName:'Body Treatments',name:'Glow Body Polish',price:35000,duration:60,desc:'Exfoliating body care for smoother, radiant-looking skin.'},
{id:'brightening',category:'body',categoryName:'Body Treatments',name:'Brightening / Lightening Treatment',price:40000,duration:75,desc:'A professional tone-evening body treatment.'},
{id:'hammam',category:'body',categoryName:'Body Treatments',name:'Hammam Bath',price:50000,duration:90,desc:'A cleansing and restorative traditional bath ritual.'},
{id:'foot-detox',category:'wellness',categoryName:'Wellness Services',name:'Foot Detox',price:20000,duration:30,desc:'A relaxing foot-care wellness session.'},
{id:'pedicure',category:'wellness',categoryName:'Wellness Services',name:'Pedicure',price:10000,duration:45,desc:'Essential grooming and restorative foot care.'},
{id:'tag-removal',category:'wellness',categoryName:'Wellness Services',name:'Tag Removal',price:10000,duration:30,desc:'Specialist service; assessment may be required.'},
{id:'stretch-treatment',category:'wellness',categoryName:'Wellness Services',name:'Stretch Marks Treatment',price:35000,duration:60,desc:'Targeted professional body-care treatment.'},
{id:'sauna',category:'wellness',categoryName:'Wellness Services',name:'Sauna Bath',price:15000,duration:30,desc:'A warm relaxation and wellness session.'},
{id:'oshot',category:'wellness',categoryName:'Wellness Services',name:'O-Shot',price:50000,duration:60,desc:'Specialist service; consultation is required before booking.'}
];
const categories=[
{id:'massage',number:'01',label:'MASSAGE',name:'Massage Therapy',intro:'Relaxation, recovery and targeted bodywork.'},
{id:'facials',number:'02',label:'FACIALS',name:'Facial Treatments',intro:'Professional skin-focused rituals for hydration and glow.'},
{id:'waxing',number:'03',label:'WAXING',name:'Waxing Services',intro:'Precise, professional hair-removal services.'},
{id:'body',number:'04',label:'BODY CARE',name:'Body Treatments',intro:'Full-body polish, brightening and hammam rituals.'},
{id:'wellness',number:'05',label:'WELLNESS',name:'Wellness Services',intro:'Detox, grooming and specialist services.'}
];
const packages={
'quiet-renewal':['swedish','foot-detox'],
'radiance-ritual':['hydra','body-polish'],
'maya-luxe':['hot-stone','hammam','pedicure']
};
const selected=new Set();
const accordion=document.querySelector('#spaAccordion');
const lines=document.querySelector('#spaSelectionLines');
const empty=document.querySelector('#spaSelectionEmpty');
const count=document.querySelector('#spaSelectedCount');
const total=document.querySelector('#spaTotal');
const duration=document.querySelector('#spaDuration');
const bookingCount=document.querySelector('#bookingServiceCount');
const bookingTotal=document.querySelector('#bookingMiniTotal');
const form=document.querySelector('#spaV3BookingForm');
const date=document.querySelector('#spaDate');
function formatDuration(mins){if(!mins)return '—';const h=Math.floor(mins/60),m=mins%60;return `${h?h+' hr'+(h>1?'s':''):''}${h&&m?' ':''}${m?m+' min':''}`}
function renderAccordion(){if(!accordion)return;accordion.innerHTML=categories.map((cat,i)=>`<section class="spa-accordion-item${i===0?' open':''}" data-category="${cat.id}"><button class="spa-accordion-trigger" type="button" aria-expanded="${i===0?'true':'false'}"><span class="spa-cat-number">${cat.number}</span><span class="spa-cat-copy"><small>${cat.label}</small><b>${cat.name}</b><em>${cat.intro}</em></span><span class="spa-cat-icon">+</span></button><div class="spa-accordion-panel">${services.filter(s=>s.category===cat.id).map(s=>`<article class="spa-v3-service${selected.has(s.id)?' selected':''}" data-id="${s.id}"><div><p>${s.name}</p><small>${s.desc}</small><span>${formatDuration(s.duration)}</span></div><div><strong>${money(s.price)}</strong><button class="service-add" type="button" data-id="${s.id}">${selected.has(s.id)?'Added ✓':'Add +'}</button></div></article>`).join('')}</div></section>`).join('');
accordion.querySelectorAll('.spa-accordion-trigger').forEach(btn=>btn.addEventListener('click',()=>{const item=btn.closest('.spa-accordion-item'),open=item.classList.contains('open');accordion.querySelectorAll('.spa-accordion-item').forEach(x=>{x.classList.remove('open');x.querySelector('.spa-accordion-trigger').setAttribute('aria-expanded','false')});if(!open){item.classList.add('open');btn.setAttribute('aria-expanded','true')}}));
accordion.querySelectorAll('.service-add').forEach(btn=>btn.addEventListener('click',()=>toggle(btn.dataset.id)));
}
function toggle(id){selected.has(id)?selected.delete(id):selected.add(id);renderAccordion();renderSummary();}
function renderSummary(){const chosen=services.filter(s=>selected.has(s.id));const sum=chosen.reduce((a,s)=>a+s.price,0),mins=chosen.reduce((a,s)=>a+s.duration,0);count.textContent=chosen.length;total.textContent=money(sum);duration.textContent=formatDuration(mins);empty.hidden=chosen.length>0;lines.innerHTML=chosen.map(s=>`<div class="experience-line"><div><b>${s.name}</b><small>${s.categoryName} · ${formatDuration(s.duration)}</small></div><div><strong>${money(s.price)}</strong><button type="button" data-remove="${s.id}" aria-label="Remove ${s.name}">×</button></div></div>`).join('');lines.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>toggle(btn.dataset.remove)));bookingCount.textContent=chosen.length?`${chosen.length} service${chosen.length>1?'s':''} selected`:'No services selected yet';bookingTotal.textContent=chosen.length?`${money(sum)} · ${formatDuration(mins)}`:'Choose from the menu above';}
function openCategory(id){const target=accordion.querySelector(`[data-category="${id}"]`);if(!target)return;accordion.querySelectorAll('.spa-accordion-item').forEach(x=>{x.classList.remove('open');x.querySelector('.spa-accordion-trigger').setAttribute('aria-expanded','false')});target.classList.add('open');target.querySelector('.spa-accordion-trigger').setAttribute('aria-expanded','true');document.querySelector('#spaBuilder').scrollIntoView({behavior:'smooth',block:'start'});}
document.querySelectorAll('[data-open-category]').forEach(btn=>btn.addEventListener('click',()=>openCategory(btn.dataset.openCategory)));
document.querySelectorAll('.package-add').forEach(btn=>btn.addEventListener('click',()=>{(packages[btn.dataset.package]||[]).forEach(id=>selected.add(id));renderAccordion();renderSummary();document.querySelector('#spaBuilder').scrollIntoView({behavior:'smooth',block:'start'});}));
document.querySelector('#clearSpaSelection')?.addEventListener('click',()=>{selected.clear();renderAccordion();renderSummary();});
if(date){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());date.min=d.toISOString().split('T')[0]}
form?.addEventListener('submit',e=>{e.preventDefault();if(!selected.size){document.querySelector('#spaBuilder').scrollIntoView({behavior:'smooth'});alert('Please add at least one spa service before reserving.');return}if(!form.reportValidity())return;const chosen=services.filter(s=>selected.has(s.id));const sum=chosen.reduce((a,s)=>a+s.price,0),mins=chosen.reduce((a,s)=>a+s.duration,0);const raw=date.value;const formatted=raw?new Date(raw+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'';const items=chosen.map(s=>`• ${s.name} — ${money(s.price)}`).join('\n');const msg=["Hello Maya's Secret Spa,","","I would like to reserve the following spa experience:","",items,"",`Number of services: ${chosen.length}`,`Estimated duration: ${formatDuration(mins)}`,`Total listed price: ${money(sum)}`,"",`Name: ${document.querySelector('#spaName').value.trim()}`,`Phone: ${document.querySelector('#spaPhone').value.trim()}`,`Preferred Date: ${formatted}`,`Preferred Time: ${document.querySelector('#spaTime').value}`,`Additional Notes: ${document.querySelector('#spaNotes').value.trim()||'None'}`,"","Please confirm availability. Thank you."].join('\n');window.open('https://wa.me/2348109044321?text='+encodeURIComponent(msg),'_blank','noopener')});
renderAccordion();renderSummary();
})();
