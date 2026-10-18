import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePages,rankPlaces,searchNearby} from './integrations/discovery.js';
import {newItem} from './logic.js';
const trip={theme:'forest',start:'2026-10-23',end:'2026-10-25',items:[],stops:[]};
const center={lat:40,lng:-75};
test('discovery uses real coordinate records, excludes defunct/non-visitor places and leaves prices unknown',()=>{
 const pages=[{pageid:1,title:'River Park',description:'Public park',coordinates:[{lat:40,lon:-75}]},{pageid:2,title:'Old Museum',description:'Demolished museum',coordinates:[{lat:40,lon:-75}]},{pageid:3,title:'Theater School',description:'Graduate school',coordinates:[{lat:40,lon:-75}]},{pageid:4,title:'Museum without coordinates'}];
 const p=normalizePages(pages,center);assert.equal(p.length,1);assert.equal(p[0].priceCents,null);assert.equal(p[0].distanceKm,0);assert.equal(p[0].url,'https://en.wikipedia.org/?curid=1');
});
test('ranking responds to vibe, date season, spending mood and previously saved places',()=>{
 const places=[{title:'Park',kind:'Outdoors',distanceKm:5,url:'https://example.com/park'},{title:'Museum',kind:'Arts & culture',distanceKm:1,url:'https://example.com/museum'}];
 let context={theme:'forest',date:'2026-07-01',budget:'flexible',center,saved:[]};
 assert.equal(rankPlaces(places,context)[0].title,'Park');
 assert.equal(rankPlaces(places,{...context,theme:'city'})[0].title,'Museum');
 assert.equal(rankPlaces(places,{...context,date:'2026-12-01',budget:'low'})[0].title,'Museum');
 assert.ok(rankPlaces(places,{...context,date:'2026-12-01'})[1].reasons.includes('A cooler-season alternative'));
 assert.equal(rankPlaces(places,{...context,saved:[{url:places[0].url}]})[0].alreadySaved,true);
});
test('discovery validates bounds and date before provider call, and reports provider outages',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw new Error('offline');};
 const body={center,radius:5,date:trip.start,budget:'balanced'};
 await assert.rejects(searchNearby({...body,center:{lat:NaN,lng:0}},trip,fetcher));
 await assert.rejects(searchNearby({...body,date:'2026-11-01'},trip,fetcher));
 await assert.rejects(searchNearby({...body,radius:999},trip,fetcher));assert.equal(calls,0);
 await assert.rejects(searchNearby(body,trip,fetcher),e=>e.status===503);assert.equal(calls,1);
});
test('discovery drafts require a reviewed amount and retain validated map coordinates',()=>{
 const draft={title:'River Park',category:'Experiences',location:'River Park',coordinates:center,date:trip.start};
 assert.throws(()=>newItem({...draft,price:''},trip));
 assert.deepEqual(newItem({...draft,price:12},trip).coordinates,center);
 assert.throws(()=>newItem({...draft,price:12,coordinates:{lat:91,lng:0}},trip));
});
