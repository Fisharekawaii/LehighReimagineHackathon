import React, {useState, useRef} from 'react';
import {Compass, MapPin, ArrowUpRight, Trees, Landmark, Palette, Plus} from 'lucide-react';
import {SectionHeading, Button, Field, ErrorMessage} from '../../components/UI';
import {api} from '../../lib/api';
import {themeImages, vibes} from '../../config/assets';
const icons={'Outdoors':Trees,'Arts & culture':Palette,'Landmarks':Landmark};
export default function Explore({trip,onAdd,onDraft}) {
  const areas=[{id:'destination',title:trip.destination,location:trip.destination},...[...trip.items,...(trip.stops||[])].filter(s=>s.location||s.coordinates).map(s=>({...s,location:s.location||s.title}))];
  const [areaId,setAreaId]=useState('destination'),[date,setDate]=useState(trip.start),[radius,setRadius]=useState('5'),[budget,setBudget]=useState('balanced'),[filter,setFilter]=useState('All');
  const [matches,setMatches]=useState([]),[result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[center,setCenter]=useState(null);
  const request=useRef(0),area=areas.find(a=>a.id===areaId)||areas[0];
  function reset(){request.current++;setResult(null);setMatches([]);setError('');setBusy(false);}
  async function discover(point,token=request.current) {
    setBusy(true);setError('');
    try{const data=await api(`/trips/${trip.id}/discovery/search`,'POST',{center:point,date,radius,budget});if(token===request.current){setResult(data);setMatches([]);setCenter(point);}}
    catch(e){if(token===request.current)setError(e.message);}
    finally{if(token===request.current)setBusy(false);}
  }
  async function search(e){e.preventDefault();const token=++request.current;setBusy(true);setResult(null);setMatches([]);setError('');
    if(area.coordinates||center)return discover(area.coordinates||center,token);
    try{const found=await api(`/trips/${trip.id}/places/search`,'POST',{query:area.location});if(token===request.current){setMatches(found);if(!found.length)setError('No matching area found. Add a more specific address to your itinerary and try again.');}}
    catch(e){if(token===request.current)setError(e.message.replace('Address saved. ',''));}
    finally{if(token===request.current)setBusy(false);}
  }
  const saved=[...trip.items,...(trip.stops||[])];
  const scheduledCount=saved.filter(s=>s.date===date).length;
  const places=(result?.places||[]).map(p=>({...p,alreadySaved:saved.some(s=>s.url===p.url||s.title.toLowerCase()===p.title.toLowerCase())})).filter(p=>filter==='All'||p.kind===filter);
  return <div className="discovery-page">
    <SectionHeading title="Explore nearby" description="Places near your destinations, matched to your trip."/>
    <section className="discovery-hero" style={{backgroundImage:`linear-gradient(90deg,rgba(15,36,28,.82),rgba(15,36,28,.12)),url(${themeImages[trip.theme]||themeImages.coast})`}}>
      <div><h2>{trip.destination}</h2><p>Discover landmarks, culture and outdoor places near your trip.</p></div><span className="discovery-photo-note">Scenery inspired by your trip mood</span>
    </section>
    <form className="panel discovery-controls" onSubmit={search}>
      <div className="discovery-fields">
        <Field label="Explore around"><select value={areaId} onChange={e=>{reset();setAreaId(e.target.value);setCenter(null);}}>{areas.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></Field>
        <Field label="Day of your trip"><input type="date" min={trip.start} max={trip.end} value={date} required onChange={e=>{reset();setDate(e.target.value);}}/></Field>
        <Field label="Nearby radius"><select value={radius} onChange={e=>{reset();setRadius(e.target.value);}}>{[2,5,10].map(n=><option key={n} value={n}>{n} km</option>)}</select></Field>
        <Field label="Spending mood"><select value={budget} onChange={e=>{reset();setBudget(e.target.value);}}><option value="low">Keep it close & affordable</option><option value="balanced">Balanced discoveries</option><option value="flexible">Room to explore</option></select></Field>
      </div>
      <div className="discovery-search-row"><p>Vibe shapes your picks. Dates guide seasonal ideas. A smaller budget prioritizes less travel—not verified admission prices.</p><Button busy={busy} type="submit"><Compass size={17}/> Find nearby places</Button></div>
      <ErrorMessage error={error}/>
      {matches.length>0&&<div className="discovery-matches"><h3>Which area did you mean?</h3>{matches.map((m,i)=><button key={i} type="button" disabled={busy} onClick={()=>discover({lat:m.lat,lng:m.lng})}><MapPin size={17}/>{m.label}<ArrowUpRight size={16}/></button>)}</div>}
    </form>
    {result ? <section aria-live="polite">
      <div className="discovery-results-head"><div><h2>Near {area.title}</h2><p>{scheduledCount} planned {scheduledCount===1?'stop':'stops'} on {date}. Review hours and access before heading out.</p></div><span className="discovery-count">{result.places.length} finds</span></div>
      <div className="discovery-tabs" aria-label="Filter discoveries">{['All',...Object.keys(icons)].map(k=><button key={k} aria-pressed={filter===k} onClick={()=>setFilter(k)}>{k}</button>)}</div>
      {places.length ? <div className="discovery-grid">{places.map((p,i)=>{const Icon=icons[p.kind]||MapPin;return <article className={'discovery-card discovery-'+p.kind.split(' ')[0].toLowerCase()} key={p.id}>
        <div className="discovery-card-top"><span><Icon size={23}/></span><small>{String(i+1).padStart(2,'0')} / {p.kind}</small></div>
        <h3>{p.title}</h3><p className="discovery-description">{p.description}</p><span className="discovery-distance"><MapPin size={14}/>{p.distanceKm.toFixed(1)} km away · straight line</span>
        <div className="discovery-reasons">{p.reasons.map(r=><span key={r}>{r}</span>)}</div><p className="fine-print">Price & opening hours: check with the venue.</p>
        <div className="discovery-card-actions"><a href={p.url} target="_blank" rel="noreferrer">Read about this place <ArrowUpRight size={14}/></a><Button variant="secondary" disabled={!trip.canEdit||p.alreadySaved} onClick={()=>onDraft({title:p.title,category:'Experiences',date,location:p.title,coordinates:p.coordinates,url:p.url,quantity:1,notes:`Found via Wikipedia on ${result.checkedAt.slice(0,10)}. Verify visitor access, hours and price. ${p.description}`.slice(0,500)})}><Plus size={16}/>{p.alreadySaved?'Already in your plan':trip.canEdit?'Review draft':'Editor access needed'}</Button></div>
      </article>;})}</div>:<div className="panel discovery-empty"><Trees size={32}/><h3>No finds in this selection yet.</h3><p>Try a wider radius, another category or another stop. Coverage varies by area.</p><Button variant="secondary" onClick={()=>onAdd('Experiences')}>Add your own find</Button></div>}
      <p className="fine-print discovery-source">Descriptions adapted from <a href="https://en.wikipedia.org" target="_blank" rel="noreferrer">Wikipedia</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA</a>. Retrieved {new Date(result.checkedAt).toLocaleString()}. These are place ideas, not verified reservations or date-specific events.</p>
    </section>:!busy&&matches.length===0&&!error&&<div className="discovery-intro"><span><Trees size={26}/>Outdoors</span><span><Palette size={26}/>Culture</span><span><Landmark size={26}/>Landmarks</span></div>}
    <div className="discovery-footer"><p>Already have somewhere in mind?</p><Button variant="secondary" onClick={()=>onAdd('Experiences')}>Add your own find <ArrowUpRight size={16}/></Button></div>
  </div>;
}
