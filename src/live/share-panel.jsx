import { useEffect,useRef,useState } from 'react'
import { Radio,Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog,DialogContent,DialogTitle,DialogDescription } from '@/components/ui/dialog'
import { api } from './api'
import { createHostRecorder } from './host-recorder'
import { toast } from 'sonner'

export function SharePanel({actions,view,onLock}) {
    const [open,setOpen]=useState(false),[token,setToken]=useState(''),[room,setRoom]=useState(null),[state,setState]=useState(null),[creating,setCreating]=useState(false)
    const widget=useRef(null),recorder=useRef(null)
    const sitekey=import.meta.env.VITE_TURNSTILE_SITE_KEY
    useEffect(()=>{
        if(!open || !sitekey || room)return
        let id,disposed=false,interval
        function render(){if(!disposed && window.turnstile && widget.current){clearInterval(interval);id=window.turnstile.render(widget.current,{sitekey,action:'create-room',callback:setToken,'expired-callback':()=>setToken('')})}}
        if(!document.querySelector('script[data-turnstile]')){const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.dataset.turnstile='true';script.async=true;document.head.appendChild(script)}
        interval=setInterval(render,200);render()
        return()=>{disposed=true;clearInterval(interval);if(id!==undefined)window.turnstile?.remove(id)}
    },[open,sitekey,room])
    useEffect(()=>()=>recorder.current?.dispose(),[])
    useEffect(()=>{
        if(room && view.isBusy && !recorder.current){recorder.current=createHostRecorder(actions,room,state=>{setState(state);if(['complete','interrupted','error'].includes(state.status))onLock('complete')});recorder.current.start()}
    },[room,view.isBusy,actions])
    async function create() {
        setCreating(true)
        try {
            const config=actions.exportLiveConfig()
            if(actions.captureFrame(0).people.length>200)throw new Error('Siaran mendukung maksimal 200 karakter.')
            const created=await api('/api/rooms',{method:'POST',body:JSON.stringify({config,turnstileToken:token})})
            setRoom(created);onLock(true);setState({status:'waiting',url:location.origin+location.pathname+'#watch/'+created.id})
        }catch(error){toast.error(error.message);setToken('')}
        finally{setCreating(false)}
    }
    return <>
      <Button variant="outline" className="live-share-trigger rounded-xl" disabled={!actions || (!room && view.isBusy)} onClick={()=>setOpen(true)}><Radio/>{room?'Link tontonan':'Bagikan siaran'}</Button>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="rounded-2xl"><DialogTitle>Tonton proses acak bersama</DialogTitle>
        <DialogDescription>Satu link untuk satu proses. Nama peserta dan hasil dapat dilihat siapa saja yang memiliki link selama 7 hari.</DialogDescription>
        {!room?<><p className="text-sm">Daftar dan kategori dikunci setelah link dibuat. Mulai proses dari arena sesudah membagikan link. Maksimal 200 karakter, 3 menit, dan 1 MB rekaman.</p><div ref={widget}/><Button disabled={creating || (!!sitekey && !token)} onClick={create}>{creating?'Menyiapkan…':'Buat link tontonan'}</Button></>:
        <><p className="text-sm">{({waiting:'Link siap. Mulai pengacakan di arena.',live:'Siaran sedang direkam.',retrying:'Koneksi terputus. Mencoba mengirim ulang…',complete:'Rekaman selesai dan siap diputar ulang.',interrupted:'Rekaman berhenti sebelum selesai.',error:'Pengiriman rekaman berhenti.'})[state?.status]}</p>
        {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
        <input aria-label="Link tontonan" className="arena-input" readOnly value={state?.url || ''}/>
        <Button onClick={async()=>{try{await navigator.clipboard.writeText(state.url);toast.success('Link disalin')}catch{toast.error('Silakan salin link dari kolom di atas.')}}}><Copy/>Salin link</Button>
        <p className="text-xs text-muted-foreground">Biarkan tab host tetap terbuka sampai rekaman selesai. Pengacakan berikutnya memakai link baru.</p></>}
      </DialogContent></Dialog>
    </>
}
