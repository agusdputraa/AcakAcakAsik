import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Users } from 'lucide-react'

export function HeroScene() {
  const mount = useRef(null)
  const paused = useRef(false)
  const [isPaused, setPaused] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let disposed = false, cleanup = () => {}
    Promise.all([import('three'), import('../../engine/characters/character.js')]).then(([THREE, { createCharacter, animateCharacter }]) => {
      if (disposed) return
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
      renderer.outputEncoding = THREE.sRGBEncoding
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      mount.current.appendChild(renderer.domElement)
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(34, 1, .1, 60)
      camera.position.set(7, 6.4, 10)
      camera.lookAt(0, .9, 0)
      scene.add(new THREE.HemisphereLight(0xfffaf0, 0x64735c, 1))
      const light = new THREE.DirectionalLight(0xfff4d5, 1.1)
      light.position.set(-3, 9, 5); light.castShadow = true
      light.shadow.mapSize.set(1024,1024)
      light.shadow.camera.left=-6;light.shadow.camera.right=6
      light.shadow.camera.top=6;light.shadow.camera.bottom=-6
      light.shadow.normalBias=.025
      scene.add(light)
      const set = new THREE.Group(); scene.add(set)
      const add = (geometry,color,x,y,z) => {
        const mesh = new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.9}))
        mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true
        set.add(mesh);return mesh
      }
      add(new THREE.CylinderGeometry(3.6,3.75,.4,64),0x185d48,0,-.2,0)
      add(new THREE.CylinderGeometry(3.45,3.45,.08,64),0xc8db9e,0,.035,0)
      const podium = add(new THREE.CylinderGeometry(1.1,1.18,.45,40),0xf3dc80,0,.29,0)
      const people = [
        {color:0xf1bc48,x:0,z:0,y:.54,scale:1.2},
        {color:0xafb7e8,x:-2,z:.3,y:.08,scale:.92},
        {color:0xf2957b,x:1.9,z:.6,y:.08,scale:.92},
        {color:0x62b8ac,x:-.7,z:2,y:.08,scale:.85},
        {color:0x609bd1,x:1,z:-1.8,y:.08,scale:.88},
      ].map((p,i) => {
        const parts=createCharacter({shirtColor:p.color,styleSeed:i,scale:p.scale})
        parts.root.position.set(p.x,p.y,p.z);parts.root.rotation.y=.5
        set.add(parts.root);return parts
      })
      // A few small trees echo the parks around the real arenas.
      for (const [x,z] of [[-2,-1.8],[2,-1.8]]) {
        add(new THREE.CylinderGeometry(.11,.16,.9,8),0x816144,x,.5,z)
        const crown=add(new THREE.IcosahedronGeometry(.6,1),0x5c8b50,x,1.35,z)
        crown.scale.y=1.35
      }
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
      const applyMotion = () => {paused.current=motion.matches;setPaused(motion.matches)}
      applyMotion();motion.addEventListener('change',applyMotion)
      let frame, last=0, elapsed=0, visible=true
      const resize = new ResizeObserver(([entry]) => {
        const {width,height}=entry.contentRect
        if(!width || !height)return
        renderer.setSize(width,height)
        camera.aspect=width/height;camera.updateProjectionMatrix()
      })
      resize.observe(mount.current)
      const visibility = new IntersectionObserver(([entry])=>{visible=entry.isIntersecting})
      visibility.observe(mount.current)
      function render(now) {
        frame=requestAnimationFrame(render)
        const dt=Math.min((now-last)/1000,.05);last=now
        if(!visible || document.hidden)return
        if(!paused.current)elapsed+=dt
        set.rotation.y=Math.sin(elapsed*.22)*.15
        people.forEach((parts,i)=>{
          animateCharacter(parts,elapsed*2+i,false)
          parts.bodyPivot.position.y=Math.sin(elapsed*2+i)*.035
          parts.head.rotation.y=Math.sin(elapsed*.7+i)*.12
          if(i===0) {
            parts.rightArm.rotation.z=.95+Math.sin(elapsed*3)*.14
            parts.rightElbow.rotation.x=-.5
          }
        })
        podium.rotation.y=elapsed*.1
        renderer.render(scene,camera)
      }
      frame=requestAnimationFrame(render)
      cleanup=()=>{
        cancelAnimationFrame(frame);resize.disconnect();visibility.disconnect()
        motion.removeEventListener('change',applyMotion)
        const geometries=new Set(),materials=new Set()
        scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);o.skeleton?.dispose()})
        geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())
        renderer.dispose();renderer.domElement.remove()
      }
    }).catch(()=>{if(!disposed)setFailed(true)})
    return ()=>{disposed=true;cleanup()}
  },[])
  return <div className="home-scene">
    <div ref={mount} className="home-scene-canvas" role="img" aria-label="Lima karakter arena berkumpul di panggung taman 3D"/>
    {failed && <div className="home-scene-fallback"><Users size={90}/><strong>Semua kebagian serunya.</strong></div>}
    {!failed && <button className="home-motion" onClick={()=>{paused.current=!paused.current;setPaused(paused.current)}} aria-label={isPaused?'Putar animasi':'Jeda animasi'}>{isPaused?<Play size={15}/>:<Pause size={15}/>}</button>}
  </div>
}
