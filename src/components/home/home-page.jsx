import { ArrowUpRight, ArrowRight, Sparkles, Users, Flag, BookOpen, ListVideo, Check, Shuffle } from 'lucide-react'
import { HeroScene } from './hero-scene'
import '../../styles/home.css'

const categories = [
  {id:'single',name:'Single',icon:Sparkles,color:'peach',eyebrow:'SATU YANG TERPILIH',description:'Cocok untuk memilih satu orang secara acak dari daftar peserta.',detail:'Presentasi · Giliran · Ice breaking',art:'single'},
  {id:'groups',name:'Grup',icon:Users,color:'green',eyebrow:'BERSAMA JADI SERU',description:'Cocok untuk membagi peserta menjadi kelompok secara acak.',detail:'Kelas · Diskusi · Kerja tim',art:'groups'},
  {id:'race',name:'Urutan',icon:Flag,color:'yellow',eyebrow:'SIAPA DULUAN?',description:'Cocok untuk menentukan urutan presentasi individu atau kelompok.',detail:'Individu · Kelompok · Urutan tampil',art:'race'},
  {id:'topics',name:'Topik',icon:BookOpen,color:'blue',eyebrow:'BAGI IDE, BAGI PERAN',description:'Cocok untuk menentukan topik yang didapat seseorang atau suatu kelompok.',detail:'Tugas · Tema diskusi · Pembagian materi',art:'topics'},
  {id:'choices',name:'Pilihan',icon:ListVideo,color:'lilac',eyebrow:'BIARKAN LAYAR MEMILIH',description:'Cocok untuk mengacak beberapa pilihan yang kamu punya.',detail:'Aktivitas · Ide · Keputusan kecil',art:'choices'},
]
function MiniArt({type}) {
  return <div className={'category-art art-'+type} aria-hidden="true">
    {type==='single'?<><div className="mini-spotlight"/><span className="mini-star">✦</span><i className="mini-person selected"/><i className="mini-person"/><i className="mini-person"/></>:
     type==='groups'?<>{[0,1,2].map(n=><div className="mini-team" key={n}><i className="mini-person"/><i className="mini-person"/></div>)}</>:
     type==='race'?<><div className="mini-track"><i/><i/><i/></div><Flag size={25}/><i className="mini-person"/></>:
     type==='topics'?<>{['Ide A','Ide B','Ide C'].map(t=><span className="mini-topic" key={t}>{t}<BookOpen size={18}/></span>)}</>:
     <div className="mini-screen"><span>Membaca</span><strong>✦ Menggambar</strong><span>Bermain musik</span></div>}
  </div>
}
export function HomePage() {
  const explore=()=>document.getElementById('kategori').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})
  return <main className="home-page">
    <nav className="home-nav" aria-label="Navigasi beranda">
      <a className="home-brand" href="#home" aria-label="Acak Acak Asik, beranda"><span className="home-brand-icon"><Shuffle size={23}/></span>Acak Acak <em>Asik.</em></a>
      <div className="home-nav-links"><button onClick={explore}>Kategori</button><a href="#cara-main">Cara main</a></div>
      <a href="#arena/groups" className="home-nav-start">Masuk arena <ArrowUpRight size={17}/></a>
    </nav>
    <section className="home-hero">
      <div className="hero-copy">
        <p className="home-eyebrow"><span/> SEDIKIT ACAK, BANYAK ASIK.</p>
        <h1>Biar acak.<br/>Tetap <span>kompak.<svg viewBox="0 0 360 20" aria-hidden="true"><path d="M4 14 Q170 -5 354 10"/></svg></span></h1>
        <p className="hero-description">Dari membagi kelompok sampai menentukan giliran. Ubah momen memilih jadi permainan kecil yang bikin semua ikut antusias.</p>
        <button className="home-primary" onClick={explore}>Mau main yang mana? <ArrowRight size={20}/></button>
        <div className="hero-notes"><span><Check size={15}/>Tanpa akun</span><span><Check size={15}/>Langsung di browser</span><span><Check size={15}/>Arena 3D</span></div>
      </div>
      <div className="hero-visual">
        <div className="hero-orbit"/>
        <span className="hero-spark spark-one">✳</span><span className="hero-spark spark-two">✦</span>
        <div className="hero-sticker sticker-top"><span className="sticker-dot"/><span>SEMUA PUNYA<br/><strong>kesempatan.</strong></span></div>
        <HeroScene/>
        <div className="hero-sticker sticker-bottom"><Shuffle size={20}/><span>Satu klik.<br/><strong>Banyak kemungkinan.</strong></span></div>
        <span className="hero-caption">TEMUKAN SERUNYA DI DALAM ARENA ↗</span>
      </div>
    </section>
    <section id="kategori" className="home-categories" aria-labelledby="category-title">
      <div className="home-section-heading"><div><p className="home-eyebrow">PILIH CARA MAINMU</p><h2 id="category-title">Lima cara bikin keputusan<br/>jadi lebih menyenangkan.</h2></div><p>Satu arena untuk setiap kebutuhan.<br/>Pilih kategori, sisanya biar kejutan.</p></div>
      <div className="category-grid">
        {categories.map(({id,name,icon:Icon,color,eyebrow,description,detail,art},index)=><a href={'#arena/'+id} key={id} className={'category-card card-'+color} aria-label={'Buka kategori '+name}>
          <div className="category-top"><span className="category-icon"><Icon size={22}/></span><span className="category-number">0{index+1}</span></div>
          <MiniArt type={art}/>
          <p className="category-eyebrow">{eyebrow}</p>
          <h3>{name}<span className="category-arrow"><ArrowUpRight size={22}/></span></h3>
          <p className="category-description">{description}</p><div className="category-detail">{detail}</div>
        </a>)}
        <div className="category-invite"><span className="invite-spark">✳</span><h3>Yang penting,<br/>semua ikut<br/><em>senang.</em></h3><p>Untuk kelas, komunitas, atau sekadar kumpul bersama.</p><button onClick={explore}>Pilih permainanmu <ArrowUpRight size={18}/></button></div>
      </div>
    </section>
    <section id="cara-main" className="home-how" aria-labelledby="how-title">
      <div><p className="home-eyebrow">NGGAK PAKAI RIBET</p><h2 id="how-title">Siap dalam<br/>tiga langkah.</h2><span className="how-doodle" aria-hidden="true">↳</span></div>
      <ol>{[['Pilih kategorinya','Mau membagi tim, menentukan giliran, atau memilih ide? Mulai dari yang kamu butuhkan.'],['Isi daftarnya','Masukkan nama peserta, kelompok, topik, atau pilihan. Sesuaikan pengaturan arenanya.'],['Jalankan. Nikmati kejutannya.','Tekan tombol mulai, saksikan animasinya, dan lihat hasilnya bersama-sama.']].map(([title,body],i)=><li key={title}><span>0{i+1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol>
    </section>
    <footer className="home-footer"><a className="home-brand" href="#home"><span className="home-brand-icon"><Shuffle size={20}/></span>Acak Acak <em>Asik.</em></a><p>Dibuat untuk momen kecil yang menyenangkan.</p><span>© {new Date().getFullYear()} Agus Dzuriana</span></footer>
  </main>
}
