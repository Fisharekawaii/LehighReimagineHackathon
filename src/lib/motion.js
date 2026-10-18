// Decorative pointer feedback only. Touch and reduced-motion users get a steady card.
export function tiltCard(event) {
  if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const card = event.currentTarget, box = card.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX-box.left)/box.width));
  const y = Math.max(0, Math.min(1, (event.clientY-box.top)/box.height));
  card.style.setProperty('--tilt-x', `${(0.5-y)*7}deg`);
  card.style.setProperty('--tilt-y', `${(x-0.5)*7}deg`);
  card.style.setProperty('--light-x', `${x*100}%`);
  card.style.setProperty('--light-y', `${y*100}%`);
}
export function resetTilt(event) {
  const card=event.currentTarget;
  for(const key of ['--tilt-x','--tilt-y','--light-x','--light-y'])card.style.removeProperty(key);
}
