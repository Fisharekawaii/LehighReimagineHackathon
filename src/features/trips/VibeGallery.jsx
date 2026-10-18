import React, {useRef} from 'react';
import {ChevronLeft, ChevronRight, Check} from 'lucide-react';
import {vibes, themeImages} from '../../config/assets';
// Original Helix-inspired postcard carousel. No marketplace dependency or code.
export default function VibeGallery({value, onChange, disabled=false}) {
 const keys=Object.keys(vibes), active=Math.max(0,keys.indexOf(value));
 const drag=useRef(null), suppressClick=useRef(false);
 function move(delta){if(!disabled)onChange(keys[(active+delta+keys.length)%keys.length]);}
 return <div className="vibe-gallery" role="group" aria-label="Choose a vacation theme" onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}}}>
  <div className="vibe-stage" onPointerDown={e=>{drag.current=e.clientX;suppressClick.current=false;}} onPointerUp={e=>{if(drag.current!==null&&Math.abs(e.clientX-drag.current)>45){suppressClick.current=true;move(e.clientX<drag.current?1:-1);}drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onPointerLeave={()=>{drag.current=null;}}>
   {keys.map((key,i)=>{let offset=(i-active+keys.length)%keys.length;if(offset>3)offset-=keys.length;return <button type="button" key={key} className={'vibe-postcard '+(offset===0?'chosen':'')} aria-label={vibes[key].label} aria-pressed={offset===0} disabled={disabled} onClick={()=>{if(!suppressClick.current)onChange(key);suppressClick.current=false;}} style={{'--offset':offset,'--depth':Math.abs(offset),backgroundImage:`linear-gradient(0deg,#102b28c9,transparent 75%),url(${themeImages[key]})`}}><span>{vibes[key].label}</span>{offset===0&&<Check className="vibe-selected" size={18}/>}</button>;})}
  </div>
  <div className="vibe-controls"><button type="button" className="icon-btn" disabled={disabled} aria-label="Previous theme" onClick={()=>move(-1)}><ChevronLeft size={18}/></button><p aria-live="polite">{vibes[keys[active]].label} <span>{String(active+1).padStart(2,'0')} / {keys.length}</span></p><button type="button" className="icon-btn" disabled={disabled} aria-label="Next theme" onClick={()=>move(1)}><ChevronRight size={18}/></button></div>
 </div>;
}
