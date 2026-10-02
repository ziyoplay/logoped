const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};

export function openRouter({key=process.env.OPENROUTER_API_KEY||'',model=process.env.OPENROUTER_MODEL||'openai/gpt-4o-mini',transport=fetch,timeoutMs=45000}={}){
 const configured=!!key.trim()&&/^[a-z0-9._-]+\/[a-z0-9._-]+$/i.test(model);
 async function generate(system,contents,schema){
  let response;
  try{
   response=await transport('https://openrouter.ai/api/v1/chat/completions',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`,'X-Title':'Nutq'},signal:AbortSignal.timeout(timeoutMs),
    body:JSON.stringify({model,messages:[{role:'system',content:system},...contents.map(message=>({role:message.role==='model'?'assistant':'user',content:message.parts.filter(part=>typeof part.text==='string').map(part=>part.text).join('')}))],max_tokens:3072,response_format:{type:'json_schema',json_schema:{name:'nutq_response',strict:true,schema}}}),
   });
  }catch{fail(503,'AI vaqtida javob bermadi. Birozdan keyin qayta urinib ko‘ring.');}
  if(response.status===429)fail(429,'AI limiti tugadi. Birozdan keyin qayta urinib ko‘ring.');
  if(!response.ok)fail(502,'AI bilan ulanishda xato. Server kaliti va model sozlamasini tekshiring.');
  try{
   const data=await response.json(),choice=data.choices?.[0];
   if(choice?.finish_reason!=='stop'||typeof choice.message?.content!=='string')throw new Error('Incomplete');
   return JSON.parse(choice.message.content);
  }catch{fail(502,'AI to‘liq javob tayyorlay olmadi. Qayta urinib ko‘ring.');}
 }
 return {configured,generate};
}