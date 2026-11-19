export const apiBase=(import.meta.env.VITE_LIVE_API_URL || '').replace(/\/$/,'')
export async function api(path,options={}) {
    const response=await fetch(apiBase+path,{...options,headers:{'Content-Type':'application/json',...options.headers},signal:options.signal || AbortSignal.timeout(15000)})
    let body
    try{body=await response.json()}catch{throw new Error('Layanan live belum tersedia. Jalankan layanan lokal atau selesaikan setup server.')}
    if(!response.ok){const error=new Error(body.error || 'Koneksi gagal.');error.status=response.status;throw error}
    return body
}
export function socketURL(id) {
    const url=new URL(apiBase+'/api/rooms/'+id+'/socket',location.origin)
    url.protocol=url.protocol==='https:'?'wss:':'ws:'
    return url.href
}
