// Distances are measured on the centre lane; each lane completes the same lap fraction.
export const CIRCUIT_X = 18
export const CIRCUIT_Z = 11
export const CORNER_RADIUS = 6
export const CIRCUIT_LENGTH = 4 * (CIRCUIT_X + CIRCUIT_Z - 2 * CORNER_RADIUS) + 2 * Math.PI * CORNER_RADIUS

export function racePoint(distance, offset = 0) {
    const x = CIRCUIT_X - CORNER_RADIUS, z = CIRCUIT_Z - CORNER_RADIUS
    const radius = CORNER_RADIUS + offset
    const arc = Math.PI * radius / 2
    const length = 4 * (x + z) + 4 * arc
    let remaining = ((distance % CIRCUIT_LENGTH) + CIRCUIT_LENGTH) % CIRCUIT_LENGTH / CIRCUIT_LENGTH * length
    const segments = [
        { length: x, point: t => [t*x, z+radius, 1, 0] },
        { length: arc, corner: [x,z,Math.PI/2] },
        { length: 2*z, point: t => [x+radius,z-2*z*t,0,-1] },
        { length: arc, corner: [x,-z,0] },
        { length: 2*x, point: t => [x-2*x*t,-z-radius,-1,0] },
        { length: arc, corner: [-x,-z,-Math.PI/2] },
        { length: 2*z, point: t => [-x-radius,-z+2*z*t,0,1] },
        { length: arc, corner: [-x,z,-Math.PI] },
        { length: x, point: t => [-x+x*t,z+radius,1,0] },
    ]
    for (const segment of segments) {
        if (remaining <= segment.length) {
            let values
            if (segment.corner) {
                const [cx,cz,start] = segment.corner
                const angle = start - remaining / radius
                values = [cx+radius*Math.cos(angle),cz+radius*Math.sin(angle),Math.sin(angle),-Math.cos(angle)]
            } else values = segment.point(remaining/segment.length)
            const [px,pz,dx,dz] = values
            return {x:px,z:pz,heading:Math.atan2(dx,dz)}
        }
        remaining -= segment.length
    }
    return {x:0,z:CIRCUIT_Z+offset,heading:Math.PI/2}
}
