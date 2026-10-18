import React,{useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {vibes,themeImages} from '../../config/assets';
// Original lightweight 3D treatment inspired by the Helix reference; no marketplace code.
export default function VibeGallery({value,onChange,disabled=false}) {
 const keys=Object.keys(vibes),active=Math.max(0,keys.indexOf(value));
 const [drag,setDrag]=useState(null);
 function move(delta){if(!disabled)onChange(keys[(active+delta+keys.length)%keys.length]);}
 return <div className="vibe-gallery" aria-label="Choose a vacation vibe"><div className="vibe-stage" onPointerDown={e=>setDrag(e.clientX)} onPointerUp={e=>{if(drag!==null&&Math.abs(e.clientX-drag)>45)move(e.clientX<drag?1:-1);setDrag(null);}} onPointerCancel={()=>setDrag(null)}>
 {keys.map((key,i)=>{let offset=(i-active+keys.length)%keys.length;if(offset>3)offset-=keys.length;return <button type="button" key={key} className={'vibe-postcard '+(offset===0?'chosen':'')} aria-label={vibes[key].label} aria-pressed={offset===0} disabled={disabled} onClick={()=>onChange(key)} style={{'--offset':offset,'--depth':Math.abs(offset),backgroundImage:`linear-gradient(0deg,#102b28b8,transparent 70%),url(${themeImages[key]})`}}><span>{vibes[key].label}</span></button>;})}</div>
 <div className="vibe-controls"><button type="button" className="icon-btn" disabled={disabled} aria-label="Previous vibe" onClick={()=>move(-1)}><ChevronLeft size={18}/></button><p>{vibes[keys[active]].caption}</p><button type="button" className="icon-btn" disabled={disabled} aria-label="Next vibe" onClick={()=>move(1)}><ChevronRight size={18}/></button></div></div>;
}
