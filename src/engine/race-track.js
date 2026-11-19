import * as THREE from 'three'
import { raceGroups } from './race-model.js'
import { parseGroups } from '../lib/group-format.js'
import { CIRCUIT_Z, CIRCUIT_LENGTH, racePoint } from './race-path.js'
export function attachRaceTrack(engine) {
    const outline = offset => Array.from({length:257},(_,i)=>{
        const p=racePoint(i/256*CIRCUIT_LENGTH,offset);
        return new THREE.Vector2(p.x,p.z);
    });
    const shape = new THREE.Shape(outline(5));
    shape.holes.push(new THREE.Path(outline(-5).reverse()));
    const track = new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:0x56aa69,side:THREE.DoubleSide,roughness:1}));
    track.rotation.x=-Math.PI/2; track.position.y=.07; track.userData.fallbackLayer=-2;
    track.receiveShadow=true;
    engine.raceEnvGroup.add(track);
    [-5,-2.5,0,2.5,5].forEach(offset => {
        const points=outline(offset).map(p=>new THREE.Vector3(p.x,.10,p.y));
        const line=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points.flatMap((p,i)=>i?[points[i-1],p]:[])),new THREE.LineBasicMaterial({color:0x111713}));
        line.userData.fallbackLayer=-1;engine.raceEnvGroup.add(line);
    });
    const walkway=new THREE.Mesh(new THREE.BoxGeometry(3,.1,5),new THREE.MeshStandardMaterial({color:0xd6dfcf,roughness:1}));
    walkway.position.set(0,.02,18);walkway.receiveShadow=true;engine.raceEnvGroup.add(walkway);
    for(let i=0;i<12;i++) for(let j=0;j<2;j++) {
        const tile=new THREE.Mesh(new THREE.BoxGeometry(.5,.025,10/12),new THREE.MeshBasicMaterial({color:(i+j)%2 ? 0x203d30 : 0xffffff}));
        tile.position.set(j*.5-.25,.12,6+(i+.5)*10/12);tile.userData.fallbackLayer=-1;engine.raceEnvGroup.add(tile);
    }
    function positionRaceParticipants() {
        const count=engine.participantEntities.length;
        engine.participantEntities.forEach((p,index)=>{
            p.laneOffset=count===1 ? 0 : -4.3+8.6*index/(count-1);
            p.raceScale=Math.min(1,9/count);
            p.meshParts.root.scale.setScalar(Math.min(1,Math.sqrt(30/Math.max(count,1))));
            const cols=Math.min(8,Math.ceil(Math.sqrt(count*2)));
            const rows=Math.ceil(count/cols);
            const row=Math.floor(index/cols), col=index%cols;
            p.pos.set(-10+(col-(cols-1)/2)*Math.min(2.2,18/cols),.13,29+(row-(rows-1)/2)*Math.min(1.8,7/rows));
            p.meshParts.root.position.copy(p.pos);p.meshParts.root.rotation.y=Math.PI;
        });
        engine.state.racePhase='waiting';
    }
    function goToRaceStart() {
        if(engine.state.isBusy)return;
        if(engine.state.raceListType==='group-members') {
            const {error}=parseGroups(engine.state.raceGroupsText);
            if(error)return engine.showToast(error,'error');
        }
        if(raceGroups(engine.state).length<2)return engine.showToast('Masukkan minimal dua peserta atau kelompok.','error');
        engine.state.racePhase='walking';
        engine.state.raceCameraView='waiting';engine.state.cameraMode='track';
        engine.state.result=null;
        engine.participantEntities.forEach(p=>{
            p.celebrating=false;p.speed=4.5;p.isMoving=true;
            p.meshParts.root.scale.setScalar(p.raceScale);
            p.waypoints=[new THREE.Vector3(2,.13,27),new THREE.Vector3(2,.13,18),new THREE.Vector3(-2,.13,CIRCUIT_Z+p.laneOffset),new THREE.Vector3(0,.13,CIRCUIT_Z+p.laneOffset)];
        });
        resetRaceCamera();
        engine.setStatus('Peserta berjalan menuju garis start…',true);
    }
    function finishRaceWalk() {
        engine.state.racePhase='ready';
        if(engine.state.cameraMode==='track'){engine.state.raceCameraView='track';resetRaceCamera();}
        engine.participantEntities.forEach(p=>{p.meshParts.root.rotation.y=Math.PI/2;});
        engine.setStatus('Peserta siap. Tekan Mulai lari.',false);
    }
    function resetRaceCamera() {
        const waiting=engine.state.raceCameraView !== 'track';
        engine.controls.maxDistance=engine.activateWorld?850:100;engine.camera.far=engine.activateWorld?1500:220;engine.camera.updateProjectionMatrix();
        // The same low oblique view as the raffle plaza; the track preset is
        // a close rear view anchored to the start/finish instead of a runner.
        const target=waiting ? new THREE.Vector3(-10,1,24.5) : new THREE.Vector3(0,1.1,CIRCUIT_Z);
        const position=waiting ? new THREE.Vector3(-10,11.5,46.5) : new THREE.Vector3(-11,6.13,CIRCUIT_Z);
        engine.moveCameraSmoothly(position,target);
    }
    let followedId=null, previousHeading=0;
    const previousPosition=new THREE.Vector3();
    const delta=new THREE.Vector3();
    function clearFollowCamera() { followedId=null; }
    function resetFollowCamera() {
        const person=engine.participantEntities.find(p=>p.id===engine.state.cameraTarget);
        if(!person) return;
        engine.cameraAnim.active=false;
        const heading=person.meshParts.root.rotation.y;
        const side=engine.state.cameraSide==='front' ? 1 : -1;
        const racing=engine.state.mode==='race';
        const distance=racing?11:6, height=racing?6:3.8;
        engine.camera.position.set(person.pos.x+Math.sin(heading)*side*distance,person.pos.y+height,person.pos.z+Math.cos(heading)*side*distance);
        engine.controls.target.set(person.pos.x,person.pos.y+1.1,person.pos.z);
        engine.controls.update();
        previousPosition.copy(person.pos);followedId=person.id;previousHeading=heading;
    }
    function updateFollowCamera() {
        if(engine.state.cameraMode!=='follow') {followedId=null;return;}
        const person=engine.participantEntities.find(p=>p.id===engine.state.cameraTarget);
        if(!person) return;
        if(followedId!==person.id) {resetFollowCamera();return;}
        engine.cameraAnim.active=false;
        // Translate both points equally: user orbit, pan and zoom remain intact.
        delta.subVectors(person.pos,previousPosition);
        engine.camera.position.add(delta);
        engine.controls.target.add(delta);
        if(engine.state.mode==='race' && ['running','finished'].includes(engine.state.racePhase)) {
            const heading=person.meshParts.root.rotation.y;
            const offset=engine.camera.position.clone().sub(engine.controls.target);
            offset.applyAxisAngle(new THREE.Vector3(0,1,0),heading-previousHeading);
            engine.camera.position.copy(engine.controls.target).add(offset);
            previousHeading=heading;
        }
        previousPosition.copy(person.pos);
    }
    Object.assign(engine,{RACE_START_Z:CIRCUIT_Z,configureRaceLanes:()=>{},positionRaceParticipants,goToRaceStart,finishRaceWalk,resetRaceCamera,updateFollowCamera,resetFollowCamera,clearFollowCamera,CIRCUIT_LENGTH});
}
