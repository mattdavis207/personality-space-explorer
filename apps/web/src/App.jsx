import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import { useParquetData, useJsonData} from '../components/ReadParquet.jsx'
import CelebrityCard from '../components/CelebrityCard.jsx'
import * as THREE from 'three'
import './App.css'

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

function PointCloud({ data, clusterData, clusterMetadata, celebrityMetadata, onPointHover, onPointClick, selectedCluster, selectedPoint, onCelebritySelect }) {
  const pointsRef = useRef()
  const pointerDownRef = useRef({ x: 0, y: 0 })
  const { camera, raycaster, pointer, gl } = useThree()

  useEffect(() => {
    if (!pointsRef.current || !data || data.length === 0) return

    const geometry = pointsRef.current.geometry

    // create arrays for positions and colors
    const positions = new Float32Array(data.length * 3)
    const colors = new Float32Array(data.length * 3)
    const sizes = new Float32Array(data.length)

    data.forEach((point, i) => {
      // set position
      positions[i * 3] = point[0]
      positions[i * 3 + 1] = point[1]
      positions[i * 3 + 2] = point[2]

      // set size, larger for selected point
      sizes[i] = selectedPoint === i ? 3.0 : 1.0

      // set color based on cluster and selection
      let color
      if (clusterData && clusterData[i]) {
        const clusterLabel = clusterData[i][0]

        if (selectedPoint === i) {
          // Highlight selected point in white
          color = [1.0, 1.0, 1.0]
        } else if (selectedCluster !== null && clusterLabel !== selectedCluster) {
          // this dims non-selected clusters
          color = [0.2, 0.2, 0.2]
        } else {
          color = getClusterColor(clusterLabel)
        }
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

    // set attributes on the geometry
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  }, [data, clusterData, selectedCluster, selectedPoint])

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!pointsRef.current || !data) return

      // update raycaster with camera and pointer position
      raycaster.setFromCamera(pointer, camera)
      raycaster.params.Points.threshold = 0.02 // this sets radius for point detection

      // get intersected points
      const intersects = raycaster.intersectObject(pointsRef.current)

      if (intersects.length > 0) {
        const index = intersects[0].index
        const clusterLabel = clusterData && clusterData[index] ? clusterData[index][0] : 'Unknown'

        // get cluster metadata using the cluster label as key
        const clusterMeta = clusterMetadata && clusterMetadata[clusterLabel]
          ? clusterMetadata[clusterLabel]
          : null

        // get individual celebrity metadata
        const celebMeta = celebrityMetadata && celebrityMetadata[index]
          ? celebrityMetadata[index]
          : null

        if (index < 5) {
          console.log(`Point ${index} - celebMeta:`, celebMeta, 'celebrityMetadata array length:', celebrityMetadata?.length);
        }

        onPointHover({
          index,
          position: data[index],
          cluster: clusterLabel,
          clusterMetadata: clusterMeta,
          celebrityMetadata: celebMeta,
          screenPosition: { x: event.clientX, y: event.clientY }
        })
      } else {
        onPointHover(null)
      }
    }

    const handlePointerDown = (event) => {
      pointerDownRef.current = { x: event.clientX, y: event.clientY }
    }

    const handleClick = (event) => {
      if (!pointsRef.current || !data) return

      // Calculate distance moved since pointer down
      const dx = event.clientX - pointerDownRef.current.x
      const dy = event.clientY - pointerDownRef.current.y
      const distanceMoved = Math.sqrt(dx * dx + dy * dy)

      // if pointer moved more than 5 pixels, its a drag not a click
      if (distanceMoved > 5) return

      raycaster.setFromCamera(pointer, camera)
      raycaster.params.Points.threshold = 0.02

      const intersects = raycaster.intersectObject(pointsRef.current)

      if (intersects.length > 0) {
        const index = intersects[0].index
        const clusterLabel = clusterData && clusterData[index] ? clusterData[index][0] : 'Unknown'
        const celebMeta = celebrityMetadata && celebrityMetadata[index] ? celebrityMetadata[index] : null

        console.log('CLICKED point:', index, 'celebrity:', celebMeta);

        // Select both cluster and individual celebrity
        onPointClick(clusterLabel)
        onCelebritySelect(index, celebMeta)
      } else{
        onPointClick(null)
        onCelebritySelect(null, null)
      }
    }

    const canvas = gl.domElement
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('click', handleClick)

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('click', handleClick)
    }
  }, [data, clusterData, clusterMetadata, celebrityMetadata, camera, raycaster, pointer, gl, onPointHover, onPointClick, onCelebritySelect])

  if (!data || data.length === 0) return null

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <pointsMaterial size={0.02} vertexColors sizeAttenuation={true} />
    </points>
  )
}

function App() {
  const { data } = useParquetData("/artifacts/embedding.parquet")
  const { data: clusterData } = useParquetData("/artifacts/clusters.parquet")
  const { data: clusterMetadata } = useJsonData("/artifacts/cluster_metadata.json")
  const { data: celebrityMetadata } = useParquetData("/artifacts/metadata.parquet", true)
  const [zoomSpeed, setZoomSpeed] = useState(1)
  const [zoomLevel, setZoomLevel] = useState(50)
  const [sidebarWidth, setSidebarWidth] = useState(20) // percentage
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [selectedCluster, setSelectedCluster] = useState(null)
  const [selectedPoint, setSelectedPoint] = useState(null)
  const [selectedCelebrity, setSelectedCelebrity] = useState(null)
  const controlsRef = useRef(null)

  const handleCelebritySelect = (pointIndex, celebrity) => {
    setSelectedPoint(pointIndex)
    setSelectedCelebrity(celebrity)
  }

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

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

  useEffect(() => {
    if (controlsRef.current && controlsRef.current.object) {
      const camera = controlsRef.current.object
      const target = controlsRef.current.target

      // Calculate direction from target to camera
      const direction = camera.position.clone().sub(target).normalize()

      // Set new camera position based on zoom level
      const distance = zoomLevel
      camera.position.copy(target).add(direction.multiplyScalar(distance))

      controlsRef.current.update()
    }
  }, [zoomLevel])

  return (
    <div className="app-container">

      {/* Left Sidebar */}
      <div className="sidebar" style={{ width: `${sidebarWidth}%` }}>
        <h1 className="sidebar-title">Personality Galaxy</h1>

        {/* Selected Celebrity Card */}
        {selectedCelebrity && (
          <CelebrityCard
            celebrity={selectedCelebrity}
            onClose={() => handleCelebritySelect(null, null)}
          />
        )}

        {/* Selected Cluster Info */}
        {selectedCluster !== null ? (
          <div className="cluster-card">
            <h2 className="cluster-title">Cluster {selectedCluster}</h2>

            {clusterMetadata && clusterMetadata[selectedCluster] ? (
              <div className="cluster-metadata">
                {Object.entries(clusterMetadata[selectedCluster]).map(([key, value]) => {
                  const isObject = typeof value === 'object' && value !== null

                  return (
                    <div key={key} className="metadata-item">
                      <span className="metadata-key">{key}: </span>

                      {isObject ? (
                        <div className="metadata-nested">
                          {Object.entries(value).map(([subKey, subValue]) => (
                            <div key={subKey} className="metadata-nested-item">
                              <span className="metadata-nested-key">{subKey}: </span>
                              <span className="metadata-value">{String(subValue)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="metadata-value">{String(value)}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="no-metadata">No metadata available</p>
            )}

            <div className="point-index" style={{ cursor: 'pointer' }} onClick={() => setSelectedCluster(null)}>
              Click to deselect cluster
            </div>
          </div>
        ) : (
          <div className="cluster-card">
            <p className="placeholder-text">Click on a point to select and highlight a cluster</p>
          </div>
        )}

        {/* Controls */}
        <div className="controls-container">
          <div className="control-card">
            <label className="control-label">
              Zoom Speed: {zoomSpeed.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={zoomSpeed}
              onChange={(e) => setZoomSpeed(Number(e.target.value))}
              className="control-slider"
            />
          </div>
        </div>
      </div>

      {/* Draggable Divider */}
      <div
        className={`divider ${isDragging ? 'divider-dragging' : 'divider-normal'}`}
        onMouseDown={handleMouseDown}
        onMouseEnter={(e) => !isDragging && e.target.classList.add('divider-hover')}
        onMouseLeave={(e) => !isDragging && e.target.classList.remove('divider-hover')}
      />

      {/* Hover Tooltip - Shows Individual Celebrity Info */}
      {hoveredPoint && hoveredPoint.celebrityMetadata && (
        <div
          className="tooltip"
          style={{
            left: hoveredPoint.screenPosition.x + 10,
            top: hoveredPoint.screenPosition.y + 10,
          }}
        >
          <div className="tooltip-title">{hoveredPoint.celebrityMetadata[1] || hoveredPoint.celebrityMetadata.name || 'Unknown'}</div>

          <div className="tooltip-metadata">
            {(hoveredPoint.celebrityMetadata[2] || hoveredPoint.celebrityMetadata.category) && (
              <div className="tooltip-item">
                <span className="tooltip-key">Category: </span>
                <span>{hoveredPoint.celebrityMetadata[2] || hoveredPoint.celebrityMetadata.category}</span>
              </div>
            )}
            {(hoveredPoint.celebrityMetadata[3] || hoveredPoint.celebrityMetadata.subcategory) && (
              <div className="tooltip-item">
                <span className="tooltip-key">Subcategory: </span>
                <span>{hoveredPoint.celebrityMetadata[3] || hoveredPoint.celebrityMetadata.subcategory}</span>
              </div>
            )}
            {(hoveredPoint.celebrityMetadata[4] || hoveredPoint.celebrityMetadata.four_letter) && (
              <div className="tooltip-item">
                <span className="tooltip-key">MBTI: </span>
                <span>{hoveredPoint.celebrityMetadata[4] || hoveredPoint.celebrityMetadata.four_letter}</span>
              </div>
            )}
            {(hoveredPoint.celebrityMetadata[5] || hoveredPoint.celebrityMetadata.enneagram) && (
              <div className="tooltip-item">
                <span className="tooltip-key">Enneagram: </span>
                <span>{hoveredPoint.celebrityMetadata[5] || hoveredPoint.celebrityMetadata.enneagram}</span>
              </div>
            )}
            {(hoveredPoint.celebrityMetadata[6] || hoveredPoint.celebrityMetadata.socionics) && (
              <div className="tooltip-item">
                <span className="tooltip-key">Socionics: </span>
                <span>{hoveredPoint.celebrityMetadata[6] || hoveredPoint.celebrityMetadata.socionics}</span>
              </div>
            )}
            {(hoveredPoint.celebrityMetadata[7] || hoveredPoint.celebrityMetadata.big_5_SLOAN) && (
              <div className="tooltip-item">
                <span className="tooltip-key">Big 5 SLOAN: </span>
                <span>{hoveredPoint.celebrityMetadata[7] || hoveredPoint.celebrityMetadata.big_5_SLOAN}</span>
              </div>
            )}
          </div>
          <div className="tooltip-footer">
            Cluster {hoveredPoint.cluster}
          </div>
        </div>
      )}

      {/* Right Canvas Area */}
      <div className="canvas-container">
        <Canvas camera={{ position: [30, 30, 30], fov: 80 }}>
          <ambientLight intensity={0.5} />
          <directionalLight color="white" position={[10, 10, 10]} intensity={1} />
          <PointCloud
            data={data}
            clusterData={clusterData}
            clusterMetadata={clusterMetadata}
            celebrityMetadata={celebrityMetadata}
            onPointHover={setHoveredPoint}
            onPointClick={setSelectedCluster}
            selectedCluster={selectedCluster}
            selectedPoint={selectedPoint}
            onCelebritySelect={handleCelebritySelect}
          />
          <OrbitControls
            ref={controlsRef}
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

        {/* Overlay Controls */}
        <div className="canvas-overlay-controls">
          <button className="reset-camera-btn" onClick={handleResetCamera}>
            Reset Camera
          </button>

          <div className="zoom-control">
            <label className="zoom-label">Zoom</label>
            <input
              type="range"
              min="10"
              max="100"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="zoom-slider"
              orient="vertical"
            />
            <span className="zoom-value">{zoomLevel}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
