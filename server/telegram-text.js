// Escape user content before composing Telegram HTML; truncate only whole cards.
export const plain=(v,n=180)=>Array.from(String(v||'')).slice(0,n).join('');
export const html=(v,n=180)=>plain(v,n).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function card(title,sections=[],footer=''){
 let text='<b>'+html(title,100)+'</b>';
 for(const section of sections){if((text+section).replace(/<[^>]*>/g,'').replace(/&(?:amp|lt|gt|quot);/g,'x').length+footer.length+80>3800){text+='\n\n<i>Ro‘yxatning qolgan qismi sayt kabinetida.</i>';break;}text+='\n\n'+section;}
 return text+(footer?'\n\n<i>'+html(footer,220)+'</i>':'');
}
export const videoCaption=title=>card('🎬 Siz uchun video',[html(title,150)],'Logoped tayyorlagan video mashq.');
