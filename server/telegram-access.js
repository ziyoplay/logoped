export function normalizePhone(value) {
 const raw=String(value||'').trim();
 if(!/^[+\d\s().-]+$/.test(raw))return '';
 let digits=raw.replace(/\D/g,'');
 if(digits.length===9&&!raw.startsWith('+'))digits='998'+digits;
 return /^[1-9]\d{7,14}$/.test(digits)?'+'+digits:'';
}

// Phone links are valid only while the patient's verified contact stays unchanged.
// Legacy username links remain available until the owner replaces or revokes them.
export const telegramAccess=`((t.verified_phone<>'' AND t.verified_phone=p.phone)
 OR (t.verified_phone='' AND t.username<>'' AND lower(t.username)=lower(p.telegram)))`;
