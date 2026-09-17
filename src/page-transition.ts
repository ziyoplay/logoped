import {flushSync} from 'react-dom';

// Keep the old page visible until React has committed the next page.
export function transitionPage(update:()=>void){
  const commit=()=>{
    flushSync(update);
    window.scrollTo({top:0,left:0,behavior:'instant'});
  };
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||!document.startViewTransition){
    commit();
    return;
  }
  const transition=document.startViewTransition(commit);
  // A hidden tab or a second navigation may skip the animation; navigation still completes.
  void transition.ready.catch(()=>{});
  void transition.finished.catch(()=>{});
}
