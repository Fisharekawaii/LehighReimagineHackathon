import { fail, validDate, coordinates } from '../logic.js';
// DISCOVERY-02: Replace this adapter with a provisioned places/events provider for
// bookable inventory, verified opening hours, restaurants and real ticket prices.
// Wikipedia is a keyless field guide, not a live availability/price service.
const cache = new Map(), pending = new Map();
const agent = 'DayTripperHackathon/0.3 (https://github.com/Fisharekawaii/LehighReimagineHackathon)';
export function distance(a,b) {
  const rad=x=>x*Math.PI/180,dlat=rad(b.lat-a.lat),dlng=rad(b.lng-a.lng);
  const h=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2;
  return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));
}
export function classify(text) {
  if (/\b(park|garden|trail|beach|waterfall|lake|forest|nature reserve|mountain|peak|botanical|canyon)\b/i.test(text)) return 'Outdoors';
  if (/\b(museum|gallery|theatre|theater|aquarium|zoo|science cent(er|re))\b/i.test(text)) return 'Arts & culture';
  if (/\b(castle|palace|monument|memorial|historic|cathedral|lighthouse|fort|temple|abbey)\b/i.test(text)) return 'Landmarks';
  return null;
}
export function normalizePages(pages,center) {
  return pages.flatMap(p=>{
    const c=p.coordinates?.[0], kind=classify(p.title+' '+(p.description||''));
    if (!kind || !c || !Number.isFinite(c.lat) || !Number.isFinite(c.lon) || !Number.isInteger(p.pageid) || /\b(former|demolished|destroyed|school|university|college|program|station|agency|company|district|neighborhood|neighbourhood|battle|riot)\b/i.test(p.description||'')) return [];
    const point={lat:c.lat,lng:c.lon};
    return [{id:'wiki-'+p.pageid,title:String(p.title).slice(0,100),description:String(p.description||'A nearby place to explore.').slice(0,250),kind,coordinates:point,distanceKm:distance(center,point),priceCents:null,url:`https://en.wikipedia.org/?curid=${p.pageid}`}];
  });
}
export function rankPlaces(places,{theme,date,budget,center,saved=[]}) {
  const month=Number(date.slice(5,7)),northWinter=[11,12,1,2].includes(month),southWinter=[5,6,7,8].includes(month);
  const coolSeason=center.lat>=0?northWinter:southWinter;
  const preferred=['forest','mountain','lake','coast','desert','countryside'].includes(theme)?'Outdoors':'Arts & culture';
  return places.map(p=>{
    let score=0;const reasons=[];
    if(p.kind===preferred){score+=5;reasons.push('Matches your trip vibe');}
    if(coolSeason && p.kind==='Arts & culture'){score+=2;reasons.push('A cooler-season alternative');}
    const winterSport=/\b(ski|skiing|snowboard)\b/i.test(p.title+' '+p.description);
    if(winterSport){score+=coolSeason?3:-3;reasons.push('Seasonal sports: confirm operating dates');}
    if(!coolSeason && p.kind==='Outdoors' && !winterSport){score+=2;reasons.push('A seasonal outdoor idea');}
    score-=p.distanceKm*(budget==='low'?1.5:budget==='flexible'?0.05:0.25);
    if(budget==='low')reasons.push('Closer places ranked higher to limit travel costs');
    const alreadySaved=saved.some(s=>s.url===p.url || s.title?.toLowerCase()===p.title.toLowerCase());
    return {...p,score,reasons,alreadySaved};
  }).sort((a,b)=>b.score-a.score||a.distanceKm-b.distanceKm).slice(0,24);
}
async function fetchPlaces(center,radius,fetcher) {
  const key=`${center.lat.toFixed(4)},${center.lng.toFixed(4)},${radius}`;
  const hit=cache.get(key);if(hit && Date.now()-hit.time<1800000)return hit;
  if(pending.has(key))return pending.get(key);
  const task=(async()=>{
    const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',generator:'geosearch',ggscoord:`${center.lat}|${center.lng}`,ggsradius:String(radius*1000),ggslimit:'100',ggsnamespace:'0',prop:'coordinates|description',colimit:'max'});
    const response=await fetcher('https://en.wikipedia.org/w/api.php?'+params,{headers:{'User-Agent':agent,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error('provider');
    const data=await response.json();if(data.error)throw new Error('provider');
    const value={places:normalizePages(data.query?.pages||[],center),time:Date.now()};
    if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,value);return value;
  })();
  pending.set(key,task);try{return await task;}finally{pending.delete(key);}
}
export async function searchNearby(body,trip,fetcher=fetch) {
  const center=coordinates(body.center),radius=Number(body.radius||5),date=body.date||trip.start;
  if(![2,5,10].includes(radius))fail('Choose a 2, 5 or 10 km search radius.');
  if(!validDate(date)||date<trip.start||date>trip.end)fail('Choose a discovery date within this trip.');
  if(!['low','balanced','flexible'].includes(body.budget))fail('Choose a budget preference.');
  let data;try{data=await fetchPlaces(center,radius,fetcher);}catch{fail('Nearby discovery is unavailable right now. Try again shortly or add your own find.',503);}
  return {places:rankPlaces(data.places,{theme:trip.theme,date,budget:body.budget,center,saved:[...trip.items,...(trip.stops||[])]}),checkedAt:new Date(data.time).toISOString(),date,radius,source:'Wikipedia',scheduledCount:[...trip.items,...(trip.stops||[])].filter(s=>s.date===date).length};
}
