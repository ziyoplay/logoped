export async function api<T=unknown>(url:string,options:RequestInit={}):Promise<T>{
  let res:Response;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{res=await fetch('/api'+url,{...options,headers:{'Content-Type':'application/json','X-Requested-With':'Nutq',...options.headers},credentials:'same-origin',signal:controller.signal});}catch{throw new Error('Server bilan aloqa yo‘q. Internet va server ishlayotganini tekshiring.');}finally{clearTimeout(timer);}
  const data=await res.json();
  if(!res.ok){if(res.status===401&&!url.startsWith('/auth')&&url!=='/me') window.dispatchEvent(new Event('session-expired'));throw new Error(data.error||'So‘rov bajarilmadi.');}
  return data;
}
