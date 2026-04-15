import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei'
import CabinetScene from './CabinetScene.jsx'

export default function Canvas3D({ state }) {
  const { cabinetW: W, cabinetH: H, cabinetD: D } = state

  // Camera: three-quarter view. three.js Y↑, cabinet spans Y=[0..H].
  const camPos = [W * 1.8, H * 1.0, D * 2.2]
  const target = [W / 2, H / 2, D / 2]

  return (
    <div style={{ width: '100%', height: '100%', background: '#f7f8fa' }}>
      <Canvas gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={camPos} fov={45} near={1} far={10000} />
        <OrbitControls
          target={target}
          enableDamping
          dampingFactor={0.08}
          minDistance={100}
          maxDistance={5000}
        />

        <ambientLight intensity={0.55} />
        <directionalLight position={[W, H * 2, D * 1.5]} intensity={0.8} />
        <directionalLight position={[-W * 0.5, H, -D]} intensity={0.3} />

        <Grid
          position={[W / 2, 0, D / 2]}
          args={[Math.max(W, D) * 3, Math.max(W, D) * 3]}
          cellSize={50}
          cellThickness={0.5}
          cellColor="#c8d4e0"
          sectionSize={200}
          sectionThickness={1}
          sectionColor="#a0b4c8"
          fadeDistance={3000}
          fadeStrength={1}
          infiniteGrid
        />

        <CabinetScene state={state} />
      </Canvas>
    </div>
  )
}
