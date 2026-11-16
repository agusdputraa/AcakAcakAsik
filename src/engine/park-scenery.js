import * as THREE from 'three'

export function createParkScenery({trees=[],benches=[],beds=[]}) {
    const scenery=new THREE.Group()
    const wood = new THREE.MeshStandardMaterial({color:0x805c40,roughness:1})
    const leaf = new THREE.MeshStandardMaterial({color:0x397549,roughness:1})
    const paleLeaf = new THREE.MeshStandardMaterial({color:0x6d9948,roughness:1})
    const stone = new THREE.MeshStandardMaterial({color:0x7e8b7b,roughness:1})
    const trunkGeometry = new THREE.CylinderGeometry(.24,.38,2.7,7)
    const crownGeometry = new THREE.IcosahedronGeometry(1.8,1)
    function mesh(geometry,material,x,y,z,shadow=true) {
        const object=new THREE.Mesh(geometry,material)
        object.position.set(x,y,z)
        object.castShadow=shadow;object.receiveShadow=true
        scenery.add(object)
        return object
    }
    trees.forEach(([x,z],i)=>{
        mesh(trunkGeometry,wood,x,1.35,z)
        const crown=mesh(crownGeometry,i%2?leaf:paleLeaf,x,3.7,z)
        crown.scale.set(1,1.25+(i%3)*.15,1)
        crown.rotation.y=i
    })
    const seatGeo=new THREE.BoxGeometry(4,.22,1.1)
    const backGeo=new THREE.BoxGeometry(4,.75,.16)
    const legGeo=new THREE.BoxGeometry(.25,.75,.8)
    function bench(x,z,rotation=0) {
        const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=rotation
        for(const [geometry,material,px,py,pz] of [
            [seatGeo,wood,0,.85,0],[backGeo,wood,0,1.3,-.48],
            [legGeo,stone,-1.5,.38,0],[legGeo,stone,1.5,.38,0]
        ]) {
            const part=new THREE.Mesh(geometry,material)
            part.position.set(px,py,pz);part.castShadow=part.receiveShadow=true
            group.add(part)
        }
        scenery.add(group)
    }
    benches.forEach(([x,z,rotation=0])=>bench(x,z,rotation))
    const bedMat=new THREE.MeshStandardMaterial({color:0x456841,roughness:1})
    const flowerMat=new THREE.MeshStandardMaterial({color:0xf4bd53,roughness:1})
    const flowerGeo=new THREE.IcosahedronGeometry(.19,0)
    beds.forEach(([x,z])=>{
        mesh(new THREE.BoxGeometry(3,.25,2.5),stone,x,.12,z,false)
        mesh(new THREE.BoxGeometry(2.7,.32,2.2),bedMat,x,.22,z,false)
        for(let i=0;i<9;i++)mesh(flowerGeo,flowerMat,x-1+(i%3),.5,z-.8+Math.floor(i/3)*.8,false)
    })
    return scenery
}

export function attachParkScenery(engine) {
    engine.fieldEnvGroup.add(createParkScenery({
        trees:[[-22,-12],[-20,0],[-22,12],[22,-12],[20,0],[22,12],[-13,-17],[0,-18],[13,-17]],
        benches:[[-20,-5,Math.PI/2],[20,-5,-Math.PI/2]],
        beds:[[-20,7],[20,7]]
    }))
    engine.stageEnvGroup.add(createParkScenery({
        trees:[[-21,-12],[-20,0],[-22,11],[21,-12],[20,0],[22,11],[-11,-17],[0,-19],[11,-17]],
        benches:[[-18,4,Math.PI/2],[18,4,-Math.PI/2]],
        beds:[[-18,9],[18,9]]
    }))
}
