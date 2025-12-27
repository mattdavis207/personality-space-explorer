import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { useParquetData } from '../components/ReadParquet.jsx'
import * as THREE from 'three'

// Generate distinct colors for each cluster
function getClusterColor(clusterLabel) {
  const hue = (Number(clusterLabel) * 137.508) % 360 // Golden angle for good distribution
  const saturation = 0.7
  const lightness = 0.6

  // Convert HSL to RGB
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lightness - c / 2

  let r, g, b
  if (hue < 60) { r = c; g = x; b = 0 }
  else if (hue < 120) { r = x; g = c; b = 0 }
  else if (hue < 180) { r = 0; g = c; b = x }
  else if (hue < 240) { r = 0; g = x; b = c }
  else if (hue < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }

  return [r + m, g + m, b + m]
}

function PointCloud({ data, clusterData }) {
  const pointsRef = useRef()

  useEffect(() => {
    if (!pointsRef.current || !data || data.length === 0) return

    const geometry = pointsRef.current.geometry

    // Create arrays for positions and colors
    const positions = new Float32Array(data.length * 3)
    const colors = new Float32Array(data.length * 3)

    data.forEach((point, i) => {
      // Set position
      positions[i * 3] = point[0]
      positions[i * 3 + 1] = point[1]
      positions[i * 3 + 2] = point[2]

      // Set color based on cluster
      let color
      if (clusterData && clusterData[i]) {
        const clusterLabel = clusterData[i][0]
        color = getClusterColor(clusterLabel)
      } else {
        const normalizedX = (point[0] + 20) / 40
        const normalizedY = (point[1] + 20) / 40
        const normalizedZ = (point[2] + 20) / 40
        color = [normalizedX, normalizedY, normalizedZ]
      }

      colors[i * 3] = color[0]
      colors[i * 3 + 1] = color[1]
      colors[i * 3 + 2] = color[2]
    })

    // Set attributes on the geometry
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  }, [data, clusterData])

  if (!data || data.length === 0) return null

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <pointsMaterial size={0.05} vertexColors sizeAttenuation={true} depthWrite={false} />
    </points>
  )
}

function App() {
  const { data } = useParquetData("/artifacts/embedding.parquet")
  const { data: clusterData } = useParquetData("/artifacts/clusters.parquet")
  const [zoomSpeed, setZoomSpeed] = useState(1.5)
  const [sidebarWidth, setSidebarWidth] = useState(20) // percentage
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = () => {
    setIsDragging(true)
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return
      const newWidth = (e.clientX / window.innerWidth) * 100
      if (newWidth >= 15 && newWidth <= 60) {
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  return (
    <div className="w-screen h-screen bg-gray-900 flex">

      {/* Left Sidebar */}
      <div
        className="bg-gray-800 flex flex-col p-6"
        style={{ width: `${sidebarWidth}%` }}
      >
        <h1 className="text-2xl font-bold text-white mb-6">Personality Galaxy</h1>

        <div className="space-y-4">
          <div className="bg-gray-700 p-4 rounded-lg">
            <label className="text-white text-sm block mb-2">
              Zoom Speed: {zoomSpeed.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={zoomSpeed}
              onChange={(e) => setZoomSpeed(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Draggable Divider */}
      <div
        className={`w-2 cursor-col-resize transition-colors flex-shrink-0 ${
          isDragging ? 'bg-blue-500' : 'bg-gray-600 hover:bg-blue-400'
        }`}
        onMouseDown={handleMouseDown}
        style={{ minWidth: '8px' }}
      />

      {/* Right Canvas Area */}
      <div className="flex-1 h-full">
        <Canvas camera={{ position: [30, 30, 30], fov: 80 }}>
          <ambientLight intensity={0.5} />
          <directionalLight color="white" position={[10, 10, 10]} intensity={1} />
          <PointCloud data={data} clusterData={clusterData} />
          <OrbitControls
            enableRotate
            enableDamping
            enablePan
            enableZoom
            dampingFactor={0.5}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
            screenSpacePanning={true}
            zoomSpeed={zoomSpeed}
            maxZoom={200}
            minZoom={100}
          />
          <axesHelper args={[30]} />
          {/* <Stats /> */}
        </Canvas>
      </div>
    </div>
  )
}

export default App
