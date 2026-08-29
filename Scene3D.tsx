"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import type { Mesh } from "three";

function CodeBox({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = state.clock.elapsedTime * 0.3 + position[0];
    ref.current.rotation.y = state.clock.elapsedTime * 0.4 + position[1];
  });
  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={1.2}>
      <mesh ref={ref} position={position}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color={color} wireframe transparent opacity={0.7} />
      </mesh>
    </Float>
  );
}

export default function Scene3D() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
      setOk(!!gl);
    } catch {
      setOk(false);
    }
  }, []);

  if (!ok) return null;

  return (
    <div className="pointer-events-none absolute inset-0 opacity-80">
      <Canvas camera={{ position: [0, 0, 6], fov: 60 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={1} />
        <Stars radius={40} depth={30} count={1200} factor={3} fade speed={0.5} />
        <CodeBox position={[-2, 1, 0]} color="#3b82f6" />
        <CodeBox position={[2, -0.5, -1]} color="#8b5cf6" />
        <CodeBox position={[0, 1.5, -2]} color="#60a5fa" />
        <CodeBox position={[-1.5, -1.2, 1]} color="#a78bfa" />
        <fog attach="fog" args={["#0a0a0f", 4, 14]} />
      </Canvas>
    </div>
  );
}
