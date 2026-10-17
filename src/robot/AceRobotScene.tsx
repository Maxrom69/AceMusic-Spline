import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { PlaybackState } from "../types";
import { usePointerAim } from "../hooks/usePointerAim";

interface RobotProps {
  reducedMotion: boolean;
  playback: PlaybackState;
  energy: number;
}

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

export function AceRobotScene({ reducedMotion, playback, energy }: RobotProps) {
  const head = useRef<THREE.Group>(null);
  const leftPupil = useRef<THREE.Mesh>(null);
  const rightPupil = useRef<THREE.Mesh>(null);
  const leftIris = useRef<THREE.Mesh>(null);
  const rightIris = useRef<THREE.Mesh>(null);
  const chestLight = useRef<THREE.PointLight>(null);
  const chestCore = useRef<THREE.Mesh>(null);
  const eyeGlow = useRef<THREE.MeshStandardMaterial[]>([]);
  const aim = usePointerAim();
  const headEuler = useRef({ x: 0, y: 0 });
  const eye = useRef({ x: 0, y: 0 });

  const metal = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#1b2438"),
        metalness: 0.82,
        roughness: 0.28,
        clearcoat: 0.65,
        clearcoatRoughness: 0.2,
        envMapIntensity: 1.1,
      }),
    [],
  );
  const darkMetal = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#0c1220"),
        metalness: 0.9,
        roughness: 0.22,
        clearcoat: 0.8,
      }),
    [],
  );
  const magentaTrim = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#2a1030"),
        emissive: new THREE.Color("#ff2bd6"),
        emissiveIntensity: 0.85,
        metalness: 0.4,
        roughness: 0.35,
      }),
    [],
  );
  const eyeWhite = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#071018"),
        roughness: 0.18,
        metalness: 0.15,
        clearcoat: 1,
      }),
    [],
  );

  useFrame(({ clock }, dt) => {
    const t = clock.getElapsedTime();
    const pointer = aim.current;
    const idle = !pointer.active && !reducedMotion;
    const targetYaw = reducedMotion ? 0 : idle ? Math.sin(t * 0.55) * 0.18 : THREE.MathUtils.clamp(pointer.x, -1, 1) * 0.42;
    const targetPitch = reducedMotion ? 0 : idle ? Math.sin(t * 0.4) * 0.06 : THREE.MathUtils.clamp(-pointer.y, -1, 1) * 0.22;
    const eyeYaw = reducedMotion ? 0 : idle ? Math.sin(t * 0.55 + 0.25) * 0.22 : THREE.MathUtils.clamp(pointer.x, -1, 1) * 0.32;
    const eyePitch = reducedMotion ? 0 : idle ? Math.sin(t * 0.4 + 0.2) * 0.08 : THREE.MathUtils.clamp(-pointer.y, -1, 1) * 0.2;

    headEuler.current.y = damp(headEuler.current.y, targetYaw, 4.2, dt);
    headEuler.current.x = damp(headEuler.current.x, targetPitch, 4.2, dt);
    eye.current.x = damp(eye.current.x, eyeYaw, 8.5, dt);
    eye.current.y = damp(eye.current.y, eyePitch, 8.5, dt);

    if (head.current) {
      head.current.rotation.y = headEuler.current.y;
      head.current.rotation.x = headEuler.current.x;
    }
    const pupilX = eye.current.x * 0.16;
    const pupilY = eye.current.y * 0.14;
    [leftPupil.current, rightPupil.current, leftIris.current, rightIris.current].forEach((mesh, index) => {
      if (!mesh) return;
      mesh.position.x = (index % 2 === 0 ? -0.38 : 0.38) + pupilX;
      mesh.position.y = 0.08 + pupilY;
    });

    const playing = playback === "playing";
    const loading = playback === "loading";
    const pulse = reducedMotion ? 1 : 0.72 + Math.sin(t * (playing ? 6 : loading ? 4 : 1.6)) * 0.28;
    const intensity = loading ? 1.6 * pulse : playing ? 1.15 + energy * 2.2 : 0.7 * pulse;
    if (chestLight.current) chestLight.current.intensity = intensity;
    if (chestCore.current) {
      const mat = chestCore.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = playing ? 1.8 + energy * 2 : loading ? 1.4 * pulse : 0.7 * pulse;
      mat.emissive = new THREE.Color(loading ? "#ff2bd6" : "#00f0ff");
    }
    eyeGlow.current.forEach((mat) => {
      mat.emissiveIntensity = playing ? 2.4 : 1.6;
    });
  });

  return (
    <group position={[0, -0.35, 0]}>
      <mesh position={[0, -1.55, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.8, 48]} />
        <meshStandardMaterial color="#05070f" emissive="#10203a" emissiveIntensity={0.35} roughness={1} />
      </mesh>

      <group>
        <mesh material={metal} position={[0, -0.15, 0]} castShadow>
          <sphereGeometry args={[0.95, 48, 48]} />
        </mesh>
        <mesh material={darkMetal} position={[0, -0.55, 0.1]} scale={[1.05, 0.72, 0.9]}>
          <sphereGeometry args={[0.72, 48, 48]} />
        </mesh>
        <mesh material={magentaTrim} position={[0, 0.42, 0.62]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.035, 16, 48]} />
        </mesh>
        <mesh ref={chestCore} position={[0, 0.42, 0.7]}>
          <circleGeometry args={[0.28, 32]} />
          <meshStandardMaterial
            color="#041018"
            emissive="#00f0ff"
            emissiveIntensity={0.9}
            roughness={0.25}
            metalness={0.3}
          />
        </mesh>
        <pointLight ref={chestLight} position={[0, 0.42, 1.1]} color="#00f0ff" intensity={1.2} distance={4} />
        <mesh material={metal} position={[-0.95, -0.15, 0]} rotation={[0, 0, 0.35]} castShadow>
          <capsuleGeometry args={[0.16, 0.55, 8, 16]} />
        </mesh>
        <mesh material={metal} position={[0.95, -0.15, 0]} rotation={[0, 0, -0.35]} castShadow>
          <capsuleGeometry args={[0.16, 0.55, 8, 16]} />
        </mesh>
      </group>

      <group ref={head} position={[0, 1.12, 0]}>
        <mesh material={metal} castShadow>
          <sphereGeometry args={[0.82, 48, 48]} />
        </mesh>
        <RoundedBox args={[0.22, 0.34, 0.08]} radius={0.04} position={[-0.78, 0.12, 0]} rotation={[0, 0, 0.18]} material={magentaTrim} />
        <RoundedBox args={[0.22, 0.34, 0.08]} radius={0.04} position={[0.78, 0.12, 0]} rotation={[0, 0, -0.18]} material={magentaTrim} />
        <mesh material={darkMetal} position={[0, 0.86, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.28, 16]} />
        </mesh>
        <mesh position={[0, 1.04, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#041018" emissive="#9b5cff" emissiveIntensity={1.6} />
        </mesh>

        <mesh material={eyeWhite} position={[-0.38, 0.08, 0.62]}>
          <sphereGeometry args={[0.22, 32, 32]} />
        </mesh>
        <mesh material={eyeWhite} position={[0.38, 0.08, 0.62]}>
          <sphereGeometry args={[0.22, 32, 32]} />
        </mesh>
        <mesh ref={leftIris} position={[-0.38, 0.08, 0.74]}>
          <sphereGeometry args={[0.12, 24, 24]} />
          <meshStandardMaterial
            ref={(mat) => {
              if (mat) eyeGlow.current[0] = mat;
            }}
            color="#021018"
            emissive="#00f0ff"
            emissiveIntensity={2}
          />
        </mesh>
        <mesh ref={rightIris} position={[0.38, 0.08, 0.74]}>
          <sphereGeometry args={[0.12, 24, 24]} />
          <meshStandardMaterial
            ref={(mat) => {
              if (mat) eyeGlow.current[1] = mat;
            }}
            color="#021018"
            emissive="#3d7bff"
            emissiveIntensity={2}
          />
        </mesh>
        <mesh ref={leftPupil} position={[-0.38, 0.08, 0.82]}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshStandardMaterial color="#02060c" emissive="#7cf6ff" emissiveIntensity={0.6} />
        </mesh>
        <mesh ref={rightPupil} position={[0.38, 0.08, 0.82]}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshStandardMaterial color="#02060c" emissive="#7cf6ff" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[-0.32, 0.16, 0.84]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshBasicMaterial color="#e8fbff" />
        </mesh>
        <mesh position={[0.44, 0.16, 0.84]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshBasicMaterial color="#e8fbff" />
        </mesh>
        <mesh rotation={[0, 0, 0.35]} position={[0, -0.28, 0.72]}>
          <torusGeometry args={[0.16, 0.018, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#121826" emissive="#3d7bff" emissiveIntensity={0.35} />
        </mesh>
      </group>
    </group>
  );
}
