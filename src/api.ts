export class ApiError extends Error {
  status:number;
  constructor(message:string,status=0){super(message);this.name='ApiError';this.status=status;}
}
export async function api<T=unknown>(url:string,options:RequestInit={}):Promise<T>{
  let res:Response,body:string;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{
    // A previous static deployment may have cached HTML under an API URL.
    // Always read session and application data from the current server.
    res=await fetch('/api'+url,{...options,headers:{'Content-Type':'application/json','X-Requested-With':'Nutq',...options.headers},credentials:'same-origin',cache:'no-store',signal:controller.signal});
    body=await res.text();
  }catch{throw new ApiError('Server bilan aloqa yo‘q. Internet va server ishlayotganini tekshiring.');}finally{clearTimeout(timer);}
  const responseError=()=>new ApiError('Ilova serveridan ma’lumot olinmadi. Sayt ulanishini tekshirish kerak. Birozdan keyin qayta urinib ko‘ring.');
  // Reverse proxies and static hosts may return an HTML page, including with HTTP 200.
  // Never expose its contents or treat it as a successful save / expired session.
  if(!/^application\/(?:[\w.-]+\+)?json(?:\s*;|$)/i.test(res.headers.get('content-type')||''))throw responseError();
  let data;
  try{data=JSON.parse(body);}catch{throw responseError();}
  if(data===null||typeof data!=='object')throw responseError();
  if(!res.ok){if(res.status===401&&!url.startsWith('/auth')&&url!=='/me') window.dispatchEvent(new Event('session-expired'));throw new ApiError(typeof data.error==='string'?data.error:'So‘rov bajarilmadi.',res.status);}
  return data;
}
