import test from 'node:test';
import assert from 'node:assert/strict';
import {handleApi} from './api.js';
import {previewCalendar} from './integrations/calendar-import.js';
import {extractBooking,bookingDraft} from './integrations/booking.js';
import {estimateTravel} from '../src/features/maps/travel.js';
const input={title:'Forest weekend',destination:'Poconos',start:'2026-10-23',end:'2026-10-25',mode:'pool',theme:'forest'};
const ics='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:visit-1\r\nDTSTART:20261023T180000Z\r\nSUMMARY:River walk\r\nLOCATION:Shawnee Inn\r\nGEO:41.01;-75.11\r\nEND:VEVENT\r\nEND:VCALENDAR';
function fixture(){let state={trips:[],sessions:[]},version=0;const storage={read:async()=>({state:structuredClone(state),version}),write:async(s,v)=>{if(v!==version)return false;state=s;version++;return true;}};return {storage,async call(path,method='GET',body,cookie){const r=await handleApi(new Request('https://app.test/api'+path,{method,headers:{'Content-Type':'application/json',...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})}),storage);return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}};}
test('real accounts: two independent sessions, role enforcement, contribution receipt, persistence',async()=>{
 const f=fixture(),a=await f.call('/auth/register','POST',{name:'Owner',username:'owner',password:'sample-password'}),b=await f.call('/auth/register','POST',{name:'Friend',username:'friend',password:'different-password'});
 assert.equal(a.status,200);assert.equal(b.status,200);assert.ok(!JSON.stringify(a.data).includes('password'));
 assert.equal((await f.call('/demo-login','POST',{userId:'diego'})).status,403);
 assert.equal((await f.call('/auth/login','POST',{username:'owner',password:'wrong-password'})).status,401);
 const a2=await f.call('/auth/login','POST',{username:'OWNER',password:'sample-password'});assert.equal(a2.data.id,a.data.id);
 let t=(await f.call('/trips','POST',input,a.cookie)).data;
 assert.equal((await f.call(`/trips/${t.id}`,'GET',null,b.cookie)).status,404);
 t=(await f.call('/join','POST',{code:t.code},b.cookie)).data;assert.equal(t.role,'viewer');assert.equal(t.code,undefined);
 const item={title:'Cottage',category:'Stays',price:200,quantity:1};
 assert.equal((await f.call(`/trips/${t.id}/items`,'POST',item,b.cookie)).status,403);
 assert.equal((await f.call(`/trips/${t.id}/assistant/apply`,'POST',{text:'Add cottage for $20 to Stays'},b.cookie)).status,403);
 const payment=(await f.call(`/trips/${t.id}/payments`,'POST',{amount:50,method:'Venmo',purpose:'Friday dinner'},b.cookie)).data.payments[0];assert.equal(payment.method,'Venmo');assert.equal(payment.purpose,'Friday dinner');
 assert.equal((await f.call(`/trips/${t.id}/payments/${payment.id}`,'PATCH',{status:'confirmed'},b.cookie)).status,403);
 await f.call(`/trips/${t.id}/payments/${payment.id}`,'PATCH',{status:'confirmed'},a.cookie);
 await f.call(`/trips/${t.id}/members/${b.data.id}`,'PATCH',{role:'editor'},a.cookie);
 assert.equal((await f.call(`/trips/${t.id}/items`,'POST',item,b.cookie)).status,200);
 const changed=(await f.call(`/trips/${t.id}`,'GET',null,a2.cookie)).data;assert.equal(changed.items.length,1);assert.equal(changed.totals.confirmedCents,5000);
 const record=await f.storage.read();assert.notEqual(record.state.users[0].passwordHash,'sample-password');assert.equal(record.state.users[0].passwordHash.length,64);
 await f.call('/logout','POST',{},a.cookie);assert.equal((await f.call('/me','GET',null,a.cookie)).status,401);assert.equal((await f.call('/me','GET',null,a2.cookie)).status,200);
});
test('calendar import is reviewed, idempotent, membership protected and adds no costs',async()=>{
 const f=fixture(),a=await f.call('/auth/register','POST',{name:'Owner',username:'owner',password:'sample-password'});const t=(await f.call('/trips','POST',input,a.cookie)).data;
 const body={content:ics,timezone:'America/New_York'};
 const preview=await f.call(`/trips/${t.id}/calendar/preview`,'POST',body,a.cookie);assert.equal(preview.data.events[0].time,'14:00');assert.equal(preview.data.events[0].location,'Shawnee Inn');
 assert.equal((await f.call(`/trips/${t.id}`,'GET',null,a.cookie)).data.stops.length,0);
 body.selected=preview.data.events.map(e=>e.sourceId);
 for(let n=0;n<2;n++){const result=await f.call(`/trips/${t.id}/calendar/import`,'POST',body,a.cookie);assert.equal(result.data.stops.length,1);assert.equal(result.data.items.length,0);assert.equal(result.data.totals.estimatedCents,0);assert.deepEqual(result.data.stops[0].coordinates,{lat:41.01,lng:-75.11});}
});
test('calendar preserves all-day and floating time, skips recurrence/outside dates and rejects invalid files',()=>{
 const file=ics.replace('DTSTART:20261023T180000Z','DTSTART;VALUE=DATE:20261023');assert.equal(previewCalendar(file,'UTC',input).events[0].time,'');
 assert.equal(previewCalendar(ics.replace('180000Z','180000'),'America/New_York',input).events[0].time,'18:00');
 assert.equal(previewCalendar(ics.replace('SUMMARY:','RRULE:FREQ=DAILY\r\nSUMMARY:'),'UTC',input).events.length,0);
 assert.equal(previewCalendar(ics.replace('20261023','20261123'),'UTC',input).events.length,0);
 assert.throws(()=>previewCalendar('not a calendar','UTC',input));
});
test('booking metadata is a draft, explicit USD only and blocked fetches fall back',async()=>{
 const html='<meta property="og:title" content="A cottage &amp; garden"><script type="application/ld+json">{"address":{"streetAddress":"1 River Road"},"offers":{"price":250,"priceCurrency":"USD"}}</script>';
 assert.equal(extractBooking(html,'https://www.airbnb.com/rooms/1').price,250);
 assert.equal(extractBooking(html.replace('USD','EUR'),'https://www.airbnb.com/rooms/1').price,'');
 assert.equal(extractBooking(html,'x').title,'A cottage & garden');
 await assert.rejects(()=>bookingDraft('http://localhost:3001'));
 const unknown=await bookingDraft('https://airbnb.com.evil.test/',()=>{throw new Error('Must not fetch unknown hosts');});assert.equal(unknown.draft.title,'');assert.match(unknown.warning,/does not support autofill/);
 const fallback=await bookingDraft('https://www.expedia.com/test',async()=>new Response('',{status:403}));assert.equal(fallback.draft.price,'');assert.match(fallback.warning,/manually/);
});
test('travel estimates are finite for nearby, identical and long distance pins',()=>{
 for(const mode of ['car','walk','airplane','ferry']){const r=estimateTravel({lat:41,lng:-75},{lat:42,lng:-72},mode);assert.ok(r.minutes>0);assert.ok(Number.isFinite(r.km));}
 assert.equal(estimateTravel(null,{lat:1,lng:2}),null);
});

test('address-only edits preserve travel details and clear stale pins',async()=>{
 const f=fixture(),a=await f.call('/auth/register','POST',{name:'Owner',username:'owner',password:'sample-password'});
 const t=(await f.call('/trips','POST',input,a.cookie)).data;
 const added=(await f.call(`/trips/${t.id}/items`,'POST',{title:'Stay',category:'Stays',price:50,quantity:1},a.cookie)).data;
 const path=`/trips/${t.id}/locations/${added.items[0].id}`;
 await f.call(path,'PATCH',{location:'First address',lat:41,lng:-75,travelMode:'ferry',travelMinutes:45},a.cookie);
 const changed=await f.call(path,'PATCH',{location:'Second address'},a.cookie);
 assert.equal(changed.status,200);assert.equal(changed.data.items[0].coordinates,undefined);assert.equal(changed.data.items[0].travelMinutes,45);
 const pin=await f.call(path,'PATCH',{location:'Second address',lat:42,lng:-74},a.cookie);
 assert.equal(pin.data.items[0].travelMode,'ferry');
 const travel=await f.call(path,'PATCH',{travelMode:'car',travelMinutes:20},a.cookie);
 assert.deepEqual(travel.data.items[0].coordinates,{lat:42,lng:-74});assert.equal(travel.data.items[0].location,'Second address');
});

test('booking drafts follow Airbnb regional redirects without importing redirect titles',async()=>{
 const html=body=>new Response(body,{headers:{'Content-Type':'text/html'}});
 const original='https://www.airbnb.com/rooms/123';
 const result=await bookingDraft(original,async url=>url===original?html('<title>Redirecting to www.airbnb.co.uk</title><meta http-equiv="refresh" content="0;url=https://www.airbnb.co.uk/rooms/123">'):html('<meta property="og:title" content="Riverside cottage">'));
 assert.equal(result.draft.title,'Riverside cottage');assert.equal(result.draft.url,original);
 const notice=await bookingDraft(original,async()=>html('<title>Redirecting to www.airbnb.co.uk</title>'));
 assert.equal(notice.draft.title,'');assert.match(notice.warning,/manually/);
 const unsafe=await bookingDraft(original,async()=>html('<meta http-equiv="refresh" content="0;url=https://evil.test/">'));
 assert.equal(unsafe.draft.title,'');
 const regional=await bookingDraft('https://www.airbnb.co.uk/rooms/123',async()=>html('<title>Coastal cottage</title>'));
 assert.equal(regional.draft.title,'Coastal cottage');
});
test('editing a confirmed plan preserves confirmation; changing its address clears its old pin',async()=>{
 const f=fixture(),a=await f.call('/auth/register','POST',{name:'Owner',username:'owner',password:'sample-password'}),t=(await f.call('/trips','POST',input,a.cookie)).data;
 const body={title:'Museum',category:'Experiences',price:12,location:'Museum address',coordinates:{lat:41,lng:-75}};
 let r=await f.call(`/trips/${t.id}/items`,'POST',body,a.cookie);const id=r.data.items[0].id;
 await f.call(`/trips/${t.id}/items/${id}`,'PATCH',{status:'verified'},a.cookie);
 r=await f.call(`/trips/${t.id}/items/${id}`,'PATCH',{...body,price:15},a.cookie);
 assert.equal(r.data.items[0].status,'verified');assert.deepEqual(r.data.items[0].coordinates,body.coordinates);
 r=await f.call(`/trips/${t.id}/items/${id}`,'PATCH',{...body,coordinates:undefined,location:'Different address'},a.cookie);
 assert.equal(r.data.items[0].coordinates,undefined);assert.equal(r.data.totals.estimatedCents,1200);
 const outsider=await f.call('/auth/register','POST',{name:'Other',username:'other',password:'sample-password'});
 assert.equal((await f.call(`/trips/${t.id}/discovery/search`,'POST',{},outsider.cookie)).status,404);
});
test('only the organizer can delete a trip, removing access and its invite while preserving other trips',async()=>{
 const f=fixture(),a=await f.call('/auth/register','POST',{name:'Owner',username:'owner',password:'sample-password'}),b=await f.call('/auth/register','POST',{name:'Friend',username:'friend',password:'sample-password'}),c=await f.call('/auth/register','POST',{name:'Other',username:'other',password:'sample-password'});
 const t=(await f.call('/trips','POST',input,a.cookie)).data,other=(await f.call('/trips','POST',{...input,title:'Keep this trip'},a.cookie)).data;
 await f.call('/join','POST',{code:t.code},b.cookie);
 assert.equal((await f.call(`/trips/${t.id}`,'DELETE',{},b.cookie)).status,403);
 await f.call(`/trips/${t.id}/members/${b.data.id}`,'PATCH',{role:'editor'},a.cookie);
 assert.equal((await f.call(`/trips/${t.id}`,'DELETE',{},b.cookie)).status,403);
 assert.equal((await f.call(`/trips/${t.id}`,'DELETE',{},c.cookie)).status,404);
 assert.equal((await f.call(`/trips/${t.id}`,'DELETE',{},a.cookie)).status,200);
 assert.equal((await f.call(`/trips/${t.id}`,'GET',null,b.cookie)).status,404);
 assert.equal((await f.call('/join','POST',{code:t.code},b.cookie)).status,404);
 assert.deepEqual((await f.call('/trips','GET',null,a.cookie)).data.map(t=>t.id),[other.id]);
 assert.equal((await f.storage.read()).state.trips.some(trip=>trip.id===t.id),false);
});

test('category links retain transport and food categories with manual fallbacks',async()=>{
 for(const [url,category] of [['https://www.uber.com/ride','Transport'],['https://www.lyft.com/ride','Transport'],['https://www.ubereats.com/store/example','Food & drinks'],['https://www.doordash.com/store/example','Food & drinks']]){
  let fetched=false;
  const result=await bookingDraft(url,async()=>{fetched=true;return new Response('<title>Example provider</title>',{headers:{'content-type':'text/html'}});},category);
  assert.ok(fetched);assert.equal(result.draft.category,category);assert.equal(result.draft.url,url);assert.equal(result.draft.price,'');
  const blocked=await bookingDraft(url,async()=>new Response('',{status:403}),category);assert.equal(blocked.draft.category,category);assert.equal(blocked.draft.url,url);
 }
 let fetched=false;const unknown=await bookingDraft('https://example.com/activity',()=>{fetched=true;},'Experiences');assert.equal(fetched,false);assert.equal(unknown.draft.category,'Experiences');
 await assert.rejects(()=>bookingDraft('https://www.uber.com/',fetch,'Invalid'));
});
