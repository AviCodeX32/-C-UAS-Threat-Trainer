import { DroneTelemetry } from '@cuas/shared';

export interface BoidForce {
  fx: number;
  fy: number;
  fz: number;
}

export function computeBoidForces(
  current: DroneTelemetry,
  allDrones: DroneTelemetry[],
  swarmLeaderNeutralized: boolean
): BoidForce {
  let sepX = 0, sepY = 0, sepZ = 0;
  let alignX = 0, alignY = 0, alignZ = 0;
  let cohX = 0, cohY = 0, cohZ = 0;
  let neighborCount = 0;

  const separationDist = 25; // meters
  const neighborDist = 120; // meters

  // If swarm leader was killed, scatter erratically!
  if (swarmLeaderNeutralized) {
    const jitterAngle = Math.random() * Math.PI * 2;
    const scatterSpeed = 15 + Math.random() * 20;
    return {
      fx: Math.cos(jitterAngle) * scatterSpeed + (Math.random() * 8 - 4),
      fy: Math.sin(jitterAngle) * scatterSpeed + (Math.random() * 8 - 4),
      fz: (Math.random() * 6 - 3)
    };
  }

  for (const other of allDrones) {
    if (other.id === current.id || other.status !== 'flying') continue;
    if (other.swarmId !== current.swarmId) continue;

    const dx = other.x - current.x;
    const dy = other.y - current.y;
    const dz = other.z - current.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < 0.001) continue;

    // 1. Separation (< 25m)
    if (dist < separationDist) {
      const repulse = (separationDist - dist) / separationDist;
      sepX -= (dx / dist) * repulse * 25;
      sepY -= (dy / dist) * repulse * 25;
      sepZ -= (dz / dist) * repulse * 10;
    }

    // 2. Alignment & Cohesion (< 120m)
    if (dist < neighborDist) {
      alignX += other.vx;
      alignY += other.vy;
      alignZ += other.vz;

      cohX += other.x;
      cohY += other.y;
      cohZ += other.z;
      neighborCount++;
    }
  }

  let finalFx = sepX;
  let finalFy = sepY;
  let finalFz = sepZ;

  if (neighborCount > 0) {
    // Alignment average
    alignX /= neighborCount;
    alignY /= neighborCount;
    alignZ /= neighborCount;
    finalFx += (alignX - current.vx) * 0.15;
    finalFy += (alignY - current.vy) * 0.15;
    finalFz += (alignZ - current.vz) * 0.15;

    // Cohesion center of mass
    cohX /= neighborCount;
    cohY /= neighborCount;
    cohZ /= neighborCount;
    finalFx += (cohX - current.x) * 0.08;
    finalFy += (cohY - current.y) * 0.08;
    finalFz += (cohZ - current.z) * 0.04;
  }

  // 3. Outpost Attraction towards (0, 0, 0)
  const distToPost = Math.sqrt(current.x * current.x + current.y * current.y);
  if (distToPost > 1) {
    const attractSpeed = 12; // base forward march
    finalFx += (-current.x / distToPost) * attractSpeed * 0.4;
    finalFy += (-current.y / distToPost) * attractSpeed * 0.4;
  }

  // Altitude control (keep between 80m and 350m until dive)
  if (current.z > 350) finalFz -= 5;
  if (current.z < 80) finalFz += 5;

  return { fx: finalFx, fy: finalFy, fz: finalFz };
}
