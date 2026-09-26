const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};

export function gemini({key=process.env.GEMINI_API_KEY||'',model=process.env.GEMINI_MODEL||'gemini-3.5-flash-lite',transport=fetch,timeoutMs=45000}={}){
 const configured=!!key.trim()&&/^gemini-[a-z0-9.-]+$/.test(model);
 async function generate(system,contents,schema){
  let response;
  try{
   response=await transport(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:AbortSignal.timeout(timeoutMs),
    body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,
     // REST requires the protobuf enum rather than the SDK MIME string.
     generationConfig:{maxOutputTokens:3072,responseFormat:{text:{mimeType:'APPLICATION_JSON',schema}}},
    }),
   });
  }catch{fail(503,'Gemini vaqtida javob bermadi. Birozdan keyin qayta urinib ko‘ring.');}
  if(response.status===429)fail(429,'Gemini limiti tugadi. Birozdan keyin qayta urinib ko‘ring.');
  if(!response.ok)fail(502,'Gemini bilan ulanishda xato. Server kaliti va model sozlamasini tekshiring.');
  try{
   const data=await response.json(),candidate=data.candidates?.[0];
   if(candidate?.finishReason!=='STOP'||data.promptFeedback?.blockReason)throw new Error('Incomplete');
   return JSON.parse(candidate.content.parts.filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join(''));
  }catch{fail(502,'AI to‘liq javob tayyorlay olmadi. Qayta urinib ko‘ring.');}
 }
 return {configured,generate};
}
