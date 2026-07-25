import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import type { Mesh, Group } from "three";

export type Sofa3DProps = {
  colorHex: string;
  seats: number; // 2, 3, 4 (L)
  isSectional: boolean;
  fabric: "boucle" | "velvet" | "linen" | "leather";
  addons: { cupHolder: boolean; footrest: boolean; usb: boolean; storage: boolean };
};

function Cushion({ position, size, color, roughness }: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  roughness: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={0.02} />
    </mesh>
  );
}

function SofaModel({ colorHex, seats, isSectional, fabric, addons }: Sofa3DProps) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.15;
  });

  const roughness = fabric === "leather" ? 0.35 : fabric === "velvet" ? 0.55 : 0.9;
  const legColor = "#3a2b1f";
  const seatWidth = seats * 0.9; // 1.8, 2.7, 3.6
  const depth = 1.05;
  const height = 0.55;

  const seatCushions = useMemo(() => {
    const cushions: JSX.Element[] = [];
    const cw = seatWidth / seats;
    for (let i = 0; i < seats; i++) {
      const x = -seatWidth / 2 + cw / 2 + i * cw;
      cushions.push(
        <Cushion
          key={`sc-${i}`}
          position={[x, height + 0.09, 0]}
          size={[cw - 0.03, 0.18, depth - 0.15]}
          color={colorHex}
          roughness={roughness}
        />,
      );
    }
    return cushions;
  }, [seatWidth, seats, height, depth, colorHex, roughness]);

  const backCushions = useMemo(() => {
    const cushions: JSX.Element[] = [];
    const cw = seatWidth / seats;
    for (let i = 0; i < seats; i++) {
      const x = -seatWidth / 2 + cw / 2 + i * cw;
      cushions.push(
        <Cushion
          key={`bc-${i}`}
          position={[x, height + 0.55, -depth / 2 + 0.18]}
          size={[cw - 0.05, 0.55, 0.2]}
          color={colorHex}
          roughness={roughness}
        />,
      );
    }
    return cushions;
  }, [seatWidth, seats, height, depth, colorHex, roughness]);

  return (
    <group ref={group} position={[0, -0.4, 0]}>
      {/* Main base */}
      <Cushion position={[0, height / 2, 0]} size={[seatWidth, height, depth]} color={colorHex} roughness={roughness} />

      {/* Arms */}
      <Cushion position={[-seatWidth / 2 - 0.12, height / 2 + 0.15, 0]} size={[0.24, height + 0.3, depth]} color={colorHex} roughness={roughness} />
      <Cushion position={[seatWidth / 2 + 0.12, height / 2 + 0.15, 0]} size={[0.24, height + 0.3, depth]} color={colorHex} roughness={roughness} />

      {/* Backrest structure */}
      <Cushion position={[0, height + 0.45, -depth / 2 + 0.05]} size={[seatWidth, 0.9, 0.1]} color={colorHex} roughness={roughness} />

      {seatCushions}
      {backCushions}

      {/* Legs */}
      {[
        [-seatWidth / 2 + 0.1, 0, -depth / 2 + 0.1],
        [seatWidth / 2 - 0.1, 0, -depth / 2 + 0.1],
        [-seatWidth / 2 + 0.1, 0, depth / 2 - 0.1],
        [seatWidth / 2 - 0.1, 0, depth / 2 - 0.1],
      ].map((p, i) => (
        <mesh key={i} position={[p[0], -0.05, p[2]]} castShadow>
          <cylinderGeometry args={[0.05, 0.04, 0.18, 16]} />
          <meshStandardMaterial color={legColor} roughness={0.5} />
        </mesh>
      ))}

      {/* Sectional chaise */}
      {isSectional && (
        <group position={[seatWidth / 2 + 0.55, 0, depth / 2 + 0.2]}>
          <Cushion position={[0, height / 2, 0]} size={[1.05, height, depth + 0.3]} color={colorHex} roughness={roughness} />
          <Cushion position={[0, height + 0.09, 0]} size={[0.98, 0.18, depth + 0.15]} color={colorHex} roughness={roughness} />
          <Cushion position={[0.5, height + 0.15, 0]} size={[0.15, 0.4, depth + 0.3]} color={colorHex} roughness={roughness} />
        </group>
      )}

      {/* Addon: cup holder (arm-top disc) */}
      {addons.cupHolder && (
        <mesh position={[seatWidth / 2 + 0.12, height + 0.62, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.04, 24]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.4} />
        </mesh>
      )}

      {/* Addon: footrest ottoman */}
      {addons.footrest && (
        <group position={[0, 0, depth / 2 + 0.55]}>
          <Cushion position={[0, height / 2 - 0.05, 0]} size={[seatWidth * 0.7, height - 0.1, 0.55]} color={colorHex} roughness={roughness} />
        </group>
      )}

      {/* Addon: USB port (small block on arm) */}
      {addons.usb && (
        <mesh position={[-seatWidth / 2 - 0.25, height + 0.1, 0.3]} castShadow>
          <boxGeometry args={[0.03, 0.08, 0.14]} />
          <meshStandardMaterial color="#0b0b0b" emissive="#3aa3ff" emissiveIntensity={0.4} />
        </mesh>
      )}

      {/* Addon: storage drawer front */}
      {addons.storage && (
        <mesh position={[0, 0.12, depth / 2 + 0.001]} castShadow>
          <boxGeometry args={[seatWidth - 0.5, 0.22, 0.03]} />
          <meshStandardMaterial color={legColor} roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

export default function Sofa3D(props: Sofa3DProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [3.2, 2.2, 4.2], fov: 40 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#f4efe6"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 6, 4]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
      <Suspense fallback={null}>
        <SofaModel {...props} />
        <Environment preset="apartment" />
      </Suspense>
      <ContactShadows position={[0, -0.4, 0]} opacity={0.5} scale={10} blur={2.4} far={2} />
      <OrbitControls enablePan={false} minDistance={3} maxDistance={8} maxPolarAngle={Math.PI / 2.05} />
    </Canvas>
  );
}