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
    function finishBroadcast() {
        if(recorder.current) {
            recorder.current.finish()
        } else {
            onLock('complete')
            setState(s => ({ ...s, status: 'complete' }))
        }
        toast.success('Siaran langsung diselesaikan. Rekaman tersimpan!')
    }
    return <>
      <Button variant="outline" className={`live-share-trigger rounded-xl ${state?.status==='live' ? 'border-red-500 text-red-500 font-semibold' : ''}`} disabled={!actions || (!room && view.isBusy)} onClick={()=>setOpen(true)}><Radio className={state?.status==='live' ? 'animate-pulse text-red-500' : ''}/>{room?(state?.status==='live'?'🔴 Live aktif':'Link tontonan'):'Bagikan siaran'}</Button>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="rounded-2xl"><DialogTitle>Tonton proses acak bersama</DialogTitle>
        <DialogDescription>Satu link untuk satu sesi siaran. Nama peserta dan hasil dapat dilihat siapa saja yang memiliki link selama 7 hari.</DialogDescription>
        {!room?<><p className="text-sm">Kategori dikunci setelah link dibuat. Mulai proses dari arena sesudah membagikan link. Maksimal 200 karakter, 3 menit, dan 1 MB rekaman.</p><div ref={widget}/><Button disabled={creating || (!!sitekey && !token)} onClick={create}>{creating?'Menyiapkan…':'Buat link tontonan'}</Button></>:
        <><p className="text-sm font-semibold">{({waiting:'Link siap. Mulai pengacakan di arena.',live:'🔴 Siaran sedang direkam & berlangsung live.',retrying:'Koneksi terputus. Mencoba mengirim ulang…',complete:'Rekaman selesai dan siap diputar ulang.',interrupted:'Rekaman berhenti sebelum selesai.',error:'Pengiriman rekaman berhenti.'})[state?.status]}</p>
        {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
        <input aria-label="Link tontonan" className="arena-input" readOnly value={state?.url || ''}/>
        <div className="flex flex-wrap gap-2">
            <Button onClick={async()=>{try{await navigator.clipboard.writeText(state.url);toast.success('Link disalin')}catch{toast.error('Silakan salin link dari kolom di atas.')}}}><Copy/>Salin link</Button>
            {state?.status!=='complete' && state?.status!=='interrupted' && (
                <Button variant="destructive" onClick={finishBroadcast}>Selesaikan siaran</Button>
            )}
        </div>
        <p className="text-xs text-muted-foreground">Biarkan tab host tetap terbuka selama siaran berlangsung. Anda dapat mengundi beberapa kali, mengeluarkan pemenang, dan klik "Selesaikan siaran" jika sudah selesai.</p></>}
      </DialogContent></Dialog>
    </>
}
