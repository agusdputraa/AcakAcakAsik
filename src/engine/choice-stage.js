import * as THREE from 'three'

export function attachChoiceStage(engine) {
    const group=new THREE.Group()
    group.visible=false
    engine.stageEnvGroup.add(group)
    const canvas=document.createElement('canvas')
    canvas.width=1280;canvas.height=640
    const context=canvas.getContext('2d')
    const texture=new THREE.CanvasTexture(canvas)
    texture.encoding=THREE.sRGBEncoding
    texture.minFilter=THREE.LinearFilter
    texture.generateMipmaps=false
    const frameMaterial=new THREE.MeshStandardMaterial({color:0x152c2a,roughness:.9})
    const frame=new THREE.Mesh(new THREE.BoxGeometry(13,6.1,.35),frameMaterial)
    frame.position.set(0,4.5,-11.15);frame.castShadow=true
    group.add(frame)
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(12.4,5.7),new THREE.MeshBasicMaterial({map:texture,toneMapped:false,fog:false}))
    screen.position.set(0,4.5,-10.96)
    group.add(screen)
    const projector=new THREE.Mesh(new THREE.BoxGeometry(1,.4,.8),frameMaterial)
    projector.position.set(0,8.6,3)
    projector.lookAt(0,4.5,-11)
    group.add(projector)
    const lens=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.2,12),new THREE.MeshBasicMaterial({color:0xf4f3d0}))
    lens.rotation.x=Math.PI/2;lens.position.set(0,8.56,2.55)
    group.add(lens)
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.065,.08,8.4,8),frameMaterial)
    pole.position.set(7.8,4.2,3.15);group.add(pole)
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.5,.65,.15,16),frameMaterial)
    base.position.set(7.8,.15,3.15);group.add(base)
    // A closed projection frustum meets the screen without spilling onto the audience.
    const arm=new THREE.Mesh(new THREE.BoxGeometry(7.8,.12,.12),frameMaterial)
    arm.position.set(3.9,8.8,3.15);group.add(arm)
    const source=new THREE.Vector3(0,8.56,2.55)
    const corners=[[-6.05,1.8,-10.9],[6.05,1.8,-10.9],[6.05,7.2,-10.9],[-6.05,7.2,-10.9]]
    const vertices=[]
    corners.forEach((corner,i)=>vertices.push(...source.toArray(),...corner,...corners[(i+1)%4]))
    const beamGeometry=new THREE.BufferGeometry()
    beamGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3))
    const beam=new THREE.Mesh(beamGeometry,new THREE.MeshBasicMaterial({color:0xe5f6e4,transparent:true,opacity:.06,side:THREE.DoubleSide,depthWrite:false}))
    group.add(beam)

    function text(label,y,size,color,maxWidth=1080) {
        context.font='800 '+size+'px sans-serif'
        while(context.measureText(label).width>maxWidth && size>20) {
            size-=2;context.font='800 '+size+'px sans-serif'
        }
        context.fillStyle=color
        context.fillText(label,640,y,maxWidth)
    }
    function drawChoiceScreen(entries,position=0,phase='idle') {
        context.fillStyle='#102d2b';context.fillRect(0,0,1280,640)
        context.textAlign='center';context.textBaseline='middle'
        text(phase==='finished'?'PILIHAN TERPILIH':phase==='spinning'?'MENGACAK PILIHAN':'PILIHAN',70,38,'#a4d8bc')
        context.fillStyle=phase==='finished'?'#f3d578':'#245947'
        context.fillRect(72,274,1136,92)
        context.save()
        context.beginPath();context.rect(72,134,1136,370);context.clip()
        if(!entries.length)text('Tambahkan daftar pilihan',320,40,'#ffffff')
        else {
            const whole=Math.floor(position),fraction=position-whole
            for(let row=-3;row<=3;row++) {
                const index=((whole-row)%entries.length+entries.length)%entries.length
                const y=320+(row+fraction)*104
                const selected=Math.abs(y-320)<40
                text(entries[index],y,selected?52:36,selected?(phase==='finished'?'#102d2b':'#ffffff'):'#80a79b')
            }
        }
        context.restore()
        text(phase==='finished'?'Tekan Acak pilihan untuk mengundi lagi':phase==='spinning'?'Daftar bergerak ke bawah…':'Satu baris, satu peluang',568,25,'#a4d8bc')
        texture.needsUpdate=true
        // The fallback renderer also reads the current screen text.
        frame.userData.fallbackSign=entries.length?entries[((Math.round(position)%entries.length)+entries.length)%entries.length]:'PILIHAN'
        frame.userData.fallbackColor='#245947'
    }
    function setChoiceStageVisible(active) {
        group.visible=active
        if(engine.stageBanner)engine.stageBanner.visible=!active
    }
    function resetChoiceCamera() {
        // Keep the screen front-facing and the side host in view.
        const distance=engine.camera.aspect<1 ? 31 : 24
        engine.moveCameraSmoothly(new THREE.Vector3(0,10,distance),new THREE.Vector3(0,3,-6))
    }
    Object.assign(engine,{drawChoiceScreen,setChoiceStageVisible,resetChoiceCamera})
    drawChoiceScreen([])
}
