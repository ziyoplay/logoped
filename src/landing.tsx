import {IconArrowRight,IconBrandTelegram,IconPhone,IconMessageCircle,IconBook2,IconEar} from '@tabler/icons-react';
import {ThemeSwitch} from './controls';
import './public.css';
import './landing-motion.css';
import {useLandingMotion} from './landing-motion';

const services=[
 {icon:IconMessageCircle,title:'Tovushlar talaffuzi',copy:'Tovushlarni aniq aytish va ularni so‘zlarda qo‘llash ustida individual ishlash.',mark:'r · sh · s'},
 {icon:IconBook2,title:'So‘zdan hikoyaga',copy:'Lug‘at boyligi, gap tuzish va o‘z fikrini izchil ifodalashga qaratilgan mashg‘ulotlar.',mark:'so‘z → gap'},
 {icon:IconEar,title:'Tinglash va farqlash',copy:'Tovushlarni eshitish, farqlash va nutqqa e’tibor berishga yo‘naltirilgan mashqlar.',mark:'eshit · ayt'},
];
export function PublicBrand(){return <a className="public-brand" href="#bosh-sahifa"><span className="public-brand-icon"><IconMessageCircle size={24}/></span><span>Iroda<span>logoped · defektolog</span></span></a>;}
export function Landing(){const root=useLandingMotion();return <div className="public-site" ref={root}>
 <img className="room-background" src="/images/logoped-room.png" alt="" aria-hidden="true" fetchPriority="high"/>
 <header className="public-header"><PublicBrand/><nav aria-label="Sayt menyusi"><a href="#xizmatlar">Xizmatlar</a><a href="#yondashuv">Yondashuv</a><a href="#aloqa">Aloqa</a></nav><div className="public-header-actions"><ThemeSwitch/><a className="public-login" href="#kirish" aria-label="Kabinetga kirish"><span className="login-desktop-label">Kabinetga kirish</span><span className="login-mobile-label" aria-hidden="true">Kabinet</span><IconArrowRight size={16}/></a></div></header>
 <main className="public-main">
  <section className="public-hero"><div className="public-hero-copy"><span className="public-eyebrow"><i/> IRODA · LOGOPED VA DEFEKTOLOG</span><h1>Kichik tovushlar.<br/><em>Katta suhbatlar.</em></h1><p>Farzandingiz bilan tovushlarni aniq aytish, so‘zlash va fikrini ifodalash ustida birga ishlaymiz.</p><div className="public-cta-row"><a className="public-cta" href="https://t.me/Defektolog_Iroda" target="_blank" rel="noreferrer">Qabul haqida yozish <IconBrandTelegram size={20}/></a></div><span className="public-small">Savolingiz bormi? <a href="tel:+998932952290">+998 93 295 22 90</a></span></div>
   <div className="public-speech" aria-hidden="true"><div className="letter-bubble bubble-mint"><span>r</span><small>tovushdan</small></div><div className="letter-bubble bubble-purple"><span>sh</span><small>so‘zga</small></div><p className="speech-caption">Har bir tovush — bir qadam.</p></div>
  </section>
  <section id="xizmatlar" className="public-services"><div className="public-section-title"><div><span className="public-eyebrow">MASHG‘ULOTLAR</span><h2>Birga o‘rganamiz.</h2></div><p>Mashg‘ulotlar bolaning ehtiyojiga qarab tanlanadi.</p></div><div className="public-service-grid">{services.map(({icon:Icon,title,copy,mark},index)=><article key={title} data-motion-index={index}><div className="service-symbol"><Icon size={26}/><span>{mark}</span></div><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
  <section id="yondashuv" className="public-approach"><div><span className="public-eyebrow">QANDAY BOSHLAYMIZ?</span><h2>Uch oddiy qadam.</h2><p>Qabul vaqtlari, uy mashqlari va natijalar shaxsiy kabinetingizda.</p><a className="public-text-link" href="#kirish">Mening kabinetim <IconArrowRight size={18}/></a></div><ol><li><span>1</span><div><h3>Tanishamiz</h3><p>Telefon yoki Telegram orqali murojaat qilib, uchrashuv vaqtini kelishamiz.</p></div></li><li><span>2</span><div><h3>Birga ishlaymiz</h3><p>Maqsadlarni aniqlab, individual mashg‘ulotlarni boshlaymiz.</p></div></li><li><span>3</span><div><h3>O‘zgarishlarni kuzatamiz</h3><p>Logoped siz uchun akkaunt ochadi. Mashqlar va natijalarni o‘z kabinetingizda ko‘rasiz.</p></div></li></ol></section>
  <section id="aloqa" className="public-contact"><div><span className="public-eyebrow">KELING, SUHBATLASHAMIZ</span><h2>Qabulga yozilish</h2><p>Qabul va xizmatlar haqida Iroda logopedga yozing.</p></div><div className="public-contact-links"><a href="tel:+998932952290"><IconPhone/><span><small>Telefon</small>+998 93 295 22 90</span><IconArrowRight/></a><a href="https://t.me/Defektolog_Iroda" target="_blank" rel="noreferrer"><IconBrandTelegram/><span><small>Telegram</small>Defektolog Iroda</span><IconArrowRight/></a><a className="public-handle" href="https://t.me/Iroda_logoped" target="_blank" rel="noreferrer">@Iroda_logoped ↗</a></div></section>
 </main><footer className="public-footer"><PublicBrand/><span>Har bir qadam ahamiyatli.</span><a href="#kirish">Logoped va klient uchun kirish</a></footer>
 </div>;}
