import {useEffect,useRef} from 'react';

export function useLandingMotion(){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const site=root.current;
  if(!site)return;
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  let stop=()=>{};
  function configure(){
   stop();
   if(preference.matches||!site||!('IntersectionObserver' in window))return;
   const animations=new Set<Animation>();
   document.documentElement.classList.add('public-smooth-scroll');
   const reveal=new IntersectionObserver(entries=>{
    for(const entry of entries){
     if(!entry.isIntersecting)continue;
     reveal.unobserve(entry.target);
     // Content stays visible if animation support is unavailable or JS stops.
     if(typeof entry.target.animate!=='function')continue;
     const index=Number((entry.target as HTMLElement).dataset.motionIndex||0);
     const animation=entry.target.animate([
      {opacity:0,transform:'translateY(20px)'},
      {opacity:1,transform:'translateY(0)'},
     ],{duration:650,delay:index*75,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'});
     animations.add(animation);
     animation.finished.then(()=>animations.delete(animation),()=>animations.delete(animation));
    }
   },{threshold:0.12});
   site.querySelectorAll('.public-hero-copy > *, .speech-caption, .speech-path, .public-section-title, .public-service-grid > article, .public-approach > div, .public-approach li, .public-contact > div').forEach(element=>reveal.observe(element));
   let heroVisible=false;
   const update=()=>{site.dataset.floating=String(heroVisible&&!document.hidden);};
   const visibility=new IntersectionObserver(entries=>{heroVisible=entries.some(e=>e.isIntersecting);update();});
   const speech=site.querySelector('.public-speech');if(speech)visibility.observe(speech);
   document.addEventListener('visibilitychange',update);
   stop=()=>{
    reveal.disconnect();visibility.disconnect();
    animations.forEach(animation=>animation.cancel());animations.clear();
    document.removeEventListener('visibilitychange',update);
    delete site.dataset.floating;
    document.documentElement.classList.remove('public-smooth-scroll');
   };
  }
  configure();preference.addEventListener('change',configure);
  return()=>{stop();preference.removeEventListener('change',configure);};
 },[]);
 return root;
}
