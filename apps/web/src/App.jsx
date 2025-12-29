import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Stats, Html } from '@react-three/drei'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useParquetData, useJsonData} from '../components/ReadParquet.jsx'
import { BsFillInfoCircleFill, BsCamera, BsDownload } from "react-icons/bs";
import CelebrityCard from '../components/CelebrityCard.jsx'
import * as THREE from 'three'
import './App.css'

// Theme definitions
const themes = {
  dark: {
    name: 'Dark Blue',
    bgPrimary: '#111827',
    bgSecondary: '#1f2937',
    bgTertiary: '#374151',
    textPrimary: '#ffffff',
    textSecondary: '#d1d5db',
    textTertiary: '#9ca3af',
    textMuted: '#6b7280',
    accentPrimary: '#3b82f6',
    accentSecondary: '#60a5fa',
    borderColor: '#4b5563'
  },
  purple: {
    name: 'Purple Dream',
    bgPrimary: '#1a0b2e',
    bgSecondary: '#2d1b4e',
    bgTertiary: '#3f2d5c',
    textPrimary: '#ffffff',
    textSecondary: '#d8b4fe',
    textTertiary: '#c084fc',
    textMuted: '#a78bfa',
    accentPrimary: '#a855f7',
    accentSecondary: '#c084fc',
    borderColor: '#7c3aed'
  },
  neon: {
    name: 'Neon Nights',
    bgPrimary: '#0a0e27',
    bgSecondary: '#14193b',
    bgTertiary: '#1e2749',
    textPrimary: '#ffffff',
    textSecondary: '#a5f3fc',
    textTertiary: '#67e8f9',
    textMuted: '#22d3ee',
    accentPrimary: '#06b6d4',
    accentSecondary: '#22d3ee',
    borderColor: '#0891b2'
  },
  forest: {
    name: 'Forest Green',
    bgPrimary: '#052e16',
    bgSecondary: '#14532d',
    bgTertiary: '#166534',
    textPrimary: '#ffffff',
    textSecondary: '#bbf7d0',
    textTertiary: '#86efac',
    textMuted: '#4ade80',
    accentPrimary: '#22c55e',
    accentSecondary: '#4ade80',
    borderColor: '#16a34a'
  },
  sunset: {
    name: 'Sunset Orange',
    bgPrimary: '#431407',
    bgSecondary: '#7c2d12',
    bgTertiary: '#9a3412',
    textPrimary: '#ffffff',
    textSecondary: '#fed7aa',
    textTertiary: '#fdba74',
    textMuted: '#fb923c',
    accentPrimary: '#f97316',
    accentSecondary: '#fb923c',
    borderColor: '#ea580c'
  },
  midnight: {
    name: 'Midnight Blue',
    bgPrimary: '#0c0a1d',
    bgSecondary: '#1e1b3a',
    bgTertiary: '#2d2a4a',
    textPrimary: '#ffffff',
    textSecondary: '#bfdbfe',
    textTertiary: '#93c5fd',
    textMuted: '#60a5fa',
    accentPrimary: '#3b82f6',
    accentSecondary: '#60a5fa',
    borderColor: '#2563eb'
  }
}

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

// Fetch celebrity image from an API (example using Wikipedia or custom API)
async function fetchCelebrityImage(name) {
  try {
    // Example: Using Wikipedia API to get thumbnail
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`
    )
    const data = await response.json()
    return data.thumbnail?.source || null
  } catch (error) {
    console.error('Error fetching image:', error)
    return null
  }
}

// Screenshot helper component that has access to the Three.js gl context
function ScreenshotHelper({ onScreenshotRef }) {
  const { gl, scene, camera } = useThree()

  useEffect(() => {
    onScreenshotRef.current = () => {
      // Force a render
      gl.render(scene, camera)

      // Get the data URL from the WebGL canvas
      const dataURL = gl.domElement.toDataURL('image/png')

      // Download it
      const link = document.createElement('a')
      link.download = `celebpsyche-screenshot-${Date.now()}.png`
      link.href = dataURL
      link.click()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera])

  return null
}

function PointCloud({ data, clusterData, clusterMetadata, celebrityMetadata, onPointHover, onPointClick, selectedCluster, selectedPoint, onCelebritySelect, pointSize, visiblePoints }) {
  const pointsRef = useRef()
  const pointerDownRef = useRef({ x: 0, y: 0 })
  const { camera, raycaster, pointer, gl } = useThree()

  useEffect(() => {
    if (!pointsRef.current || !data || data.length === 0) return

    const geometry = pointsRef.current.geometry

    // create arrays for positions and colors
    const positions = new Float32Array(data.length * 3)
    const colors = new Float32Array(data.length * 3)

    data.forEach((point, i) => {
      // set position
      positions[i * 3] = point[0]
      positions[i * 3 + 1] = point[1]
      positions[i * 3 + 2] = point[2]

      // Check if point is visible based on filters
      const isVisible = visiblePoints === null || visiblePoints.has(i)

      // set color based on cluster and selection
      let color
      if (!isVisible) {
        // Make filtered points invisible (set alpha to 0 by making them black)
        color = [0.0, 0.0, 0.0]
      } else if (clusterData && clusterData[i]) {
        const clusterLabel = clusterData[i][0]

        if (selectedPoint === i) {
          // Highlight selected point in bright cyan/electric blue
          color = [0.0, 1.0, 1.0]
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

    // Mark attributes as needing update
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
  }, [data, clusterData, selectedCluster, selectedPoint, visiblePoints])

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
    <>
      <points ref={pointsRef}>
        <bufferGeometry />
        <pointsMaterial size={pointSize} vertexColors sizeAttenuation={true} />
      </points>

      {/* highlighted point as a glowing sphere */}
      {selectedPoint !== null && data[selectedPoint] && (
        <mesh position={[data[selectedPoint][0], data[selectedPoint][1], data[selectedPoint][2]]}>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.9} />
          {/* Outer glow ring */}
          <mesh>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.2} wireframe />
          </mesh>
        </mesh>
      )}

      {/* Floating label for selected point */}
      {selectedPoint !== null && data[selectedPoint] && celebrityMetadata && celebrityMetadata[selectedPoint] && (
        <Html position={[data[selectedPoint][0], data[selectedPoint][1], data[selectedPoint][2]]} distanceFactor={10}>
          <div style={{
            background: 'rgba(31, 41, 55, 0.95)',
            color: '#60a5fa',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '2px solid #3b82f6',
            fontSize: '14px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            transform: 'translate(-50%, -120%)'
          }}>
            {celebrityMetadata[selectedPoint][1] || celebrityMetadata[selectedPoint].name || 'Unknown'}
          </div>
        </Html>
      )}
    </>
  )
}

function App() {
  const { data } = useParquetData("/artifacts/embedding.parquet")
  const { data: clusterData } = useParquetData("/artifacts/clusters.parquet")
  const { data: clusterMetadata } = useJsonData("/artifacts/cluster_metadata.json")
  const { data: celebrityMetadata } = useParquetData("/artifacts/metadata.parquet", true)
  const [zoomSpeed, setZoomSpeed] = useState(1)
  const [zoomLevel, setZoomLevel] = useState(50)
  const [pointSize, setPointSize] = useState(0.02)
  const [sidebarWidth, setSidebarWidth] = useState(20) // percentage
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [selectedCluster, setSelectedCluster] = useState(null)
  const [selectedPoint, setSelectedPoint] = useState(null)
  const [selectedCelebrity, setSelectedCelebrity] = useState(null)
  const [mbtiFilter, setMbtiFilter] = useState('all')
  const [enneagramFilter, setEnneagramFilter] = useState('all')
  const [theme, setTheme] = useState('dark')
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const controlsRef = useRef(null)
  const sidebarRef = useRef(null)
  const screenshotRef = useRef(null)

  // handles senection of celebrity and point
  const handleCelebritySelect = async (pointIndex, celebrity) => {
    setSelectedPoint(pointIndex)

    // Fetch image URL if needed
    if (celebrity) {
      const name = celebrity[1] || celebrity.name

      // fetch celebrity image from api
      if (name) {
        const imageUrl = await fetchCelebrityImage(name)
        celebrity.image_url = imageUrl
      }
    }

    setSelectedCelebrity(celebrity)

    // Scroll sidebar to top when a celebrity is selected
    if (celebrity && sidebarRef.current) {
      sidebarRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSearch = (query) => {
    setSearchQuery(query)

    if (!query.trim() || !celebrityMetadata) {
      setSearchResult(null)
      return
    }

    const searchLower = query.toLowerCase().trim()
    const foundIndex = celebrityMetadata.findIndex(celeb => {
      const name = celeb[1] || celeb.name || ''
      return name.toLowerCase().includes(searchLower)
    })

    if (foundIndex !== -1) {
      const celebrity = celebrityMetadata[foundIndex]
      const name = celebrity[1] || celebrity.name || 'Unknown'
      setSearchResult({ found: true, index: foundIndex, name })
      handleCelebritySelect(foundIndex, celebrity)

      // Also select the cluster if available
      if (clusterData && clusterData[foundIndex]) {
        setSelectedCluster(clusterData[foundIndex][0])
      }
    } else {
      setSearchResult({ found: false })
      setSelectedPoint(null)
      setSelectedCelebrity(null)
    }
  }

  const handleResetCamera = () => {
    if (controlsRef.current && controlsRef.current.object) {
      const camera = controlsRef.current.object
      const controls = controlsRef.current

      // Reset camera position to initial values
      camera.position.set(30, 25, 30)

      // Reset target to initial value
      controls.target.set(0, 6, 0)

      // Reset zoom level
      setZoomLevel(50)

      // Update controls
      controls.update()
    }
  }

  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement

    if (theme === 'light') {
      root.style.setProperty('--bg-primary', '#f9fafb')
      root.style.setProperty('--bg-secondary', '#ffffff')
      root.style.setProperty('--bg-tertiary', '#f3f4f6')
      root.style.setProperty('--text-primary', '#111827')
      root.style.setProperty('--text-secondary', '#374151')
      root.style.setProperty('--text-tertiary', '#6b7280')
      root.style.setProperty('--text-muted', '#9ca3af')
      root.style.setProperty('--border-color', '#d1d5db')
    } else if (theme === 'cyberpunk') {
      root.style.setProperty('--bg-primary', '#0a0e27')
      root.style.setProperty('--bg-secondary', '#16213e')
      root.style.setProperty('--bg-tertiary', '#1a1a2e')
      root.style.setProperty('--text-primary', '#00fff5')
      root.style.setProperty('--text-secondary', '#ff00ff')
      root.style.setProperty('--text-tertiary', '#ffff00')
      root.style.setProperty('--text-muted', '#7b68ee')
      root.style.setProperty('--accent-primary', '#ff00ff')
      root.style.setProperty('--accent-secondary', '#00fff5')
      root.style.setProperty('--border-color', '#7b68ee')
    } else if (theme === 'forest') {
      root.style.setProperty('--bg-primary', '#1a2f1a')
      root.style.setProperty('--bg-secondary', '#243b24')
      root.style.setProperty('--bg-tertiary', '#2d4a2d')
      root.style.setProperty('--text-primary', '#e8f5e8')
      root.style.setProperty('--text-secondary', '#c8e6c8')
      root.style.setProperty('--text-tertiary', '#a8d8a8')
      root.style.setProperty('--text-muted', '#88c088')
      root.style.setProperty('--accent-primary', '#4ade80')
      root.style.setProperty('--accent-secondary', '#86efac')
      root.style.setProperty('--border-color', '#4a7c4a')
    } else {
      // dark theme (default)
      root.style.setProperty('--bg-primary', '#111827')
      root.style.setProperty('--bg-secondary', '#1f2937')
      root.style.setProperty('--bg-tertiary', '#374151')
      root.style.setProperty('--text-primary', '#ffffff')
      root.style.setProperty('--text-secondary', '#d1d5db')
      root.style.setProperty('--text-tertiary', '#9ca3af')
      root.style.setProperty('--text-muted', '#6b7280')
      root.style.setProperty('--accent-primary', '#3b82f6')
      root.style.setProperty('--accent-secondary', '#60a5fa')
      root.style.setProperty('--border-color', '#4b5563')
    }
  }, [theme])

  // Extract unique MBTI and Enneagram types from metadata
  const { uniqueMbti, uniqueEnneagram } = useMemo(() => {
    if (!celebrityMetadata || celebrityMetadata.length === 0) {
      return { uniqueMbti: [], uniqueEnneagram: [] }
    }

    const mbtiSet = new Set()
    const enneagramSet = new Set()

    celebrityMetadata.forEach(celeb => {
      const mbti = celeb[4] || celeb.four_letter
      const enneagram = celeb[5] || celeb.enneagram

      if (mbti && mbti !== 'Unknown') mbtiSet.add(mbti)
      if (enneagram && enneagram !== 'Unknown') {
        // extract main number from enneagram 
        const mainType = String(enneagram).match(/\d/)?.[0]
        if (mainType) enneagramSet.add(mainType)
      }
    })

    return {
      uniqueMbti: Array.from(mbtiSet).sort(),
      uniqueEnneagram: Array.from(enneagramSet).sort((a, b) => a - b)
    }
  }, [celebrityMetadata])

  // compute which points should be visible based on filters
  const visiblePoints = useMemo(() => {
    if (!celebrityMetadata || (mbtiFilter === 'all' && enneagramFilter === 'all')) {
      return null // null means show all points
    }

    const visible = new Set()

    celebrityMetadata.forEach((celeb, index) => {
      const mbti = celeb[4] || celeb.four_letter
      const enneagram = celeb[5] || celeb.enneagram
      const mainEnneagram = String(enneagram).match(/\d/)?.[0]

      const mbtiMatch = mbtiFilter === 'all' || mbti === mbtiFilter
      const enneagramMatch = enneagramFilter === 'all' || mainEnneagram === enneagramFilter

      if (mbtiMatch && enneagramMatch) {
        visible.add(index)
      }
    })

    // set of visible features to display
    return visible
  }, [celebrityMetadata, mbtiFilter, enneagramFilter])

  const handleMouseDown = () => {
    setIsDragging(true)
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return
      const newWidth = (e.clientX / window.innerWidth) * 100
      if (newWidth >= 10 && newWidth <= 80) {
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

  // Apply theme to CSS variables
  useEffect(() => {
    const currentTheme = themes[theme] || themes.dark
    const root = document.documentElement

    root.style.setProperty('--bg-primary', currentTheme.bgPrimary)
    root.style.setProperty('--bg-secondary', currentTheme.bgSecondary)
    root.style.setProperty('--bg-tertiary', currentTheme.bgTertiary)
    root.style.setProperty('--text-primary', currentTheme.textPrimary)
    root.style.setProperty('--text-secondary', currentTheme.textSecondary)
    root.style.setProperty('--text-tertiary', currentTheme.textTertiary)
    root.style.setProperty('--text-muted', currentTheme.textMuted)
    root.style.setProperty('--accent-primary', currentTheme.accentPrimary)
    root.style.setProperty('--accent-secondary', currentTheme.accentSecondary)
    root.style.setProperty('--border-color', currentTheme.borderColor)
  }, [theme])

  return (
    <div className="app-container">

      {/* Left Sidebar */}
      <div ref={sidebarRef} className="sidebar" style={{ width: `${sidebarWidth}%` }}>
        <div className="title-container">
          <img src="/app_icon.svg" alt="App Logo" style={{ width: '96px', height: '96px', flexShrink: 0 }} />
          <h1 className="sidebar-title">Personality Space Explorer</h1>
        </div>

        {/* Search Box */}
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchResult && (
            <div className={`search-result ${searchResult.found ? 'search-result-found' : 'search-result-not-found'}`}>
              <span className="search-result-icon">{searchResult.found ? '✓' : '✗'}</span>
              <span>{searchResult.found ? `Found: ${searchResult.name}` : 'No celebrity found with that name'}</span>
            </div>
          )}
        </div>


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

                      {key== "label" ? (<span></span>): (<span className="metadata-key">{key}: </span>)}
                    
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
                        key === "label" ? (<span className="metadata-label">{String(value)}</span>) :
                              (<span className="metadata-value">{String(value)}</span>)
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

        {/* Filters */}
        
        {/* MBTI Type Dropdown Filter  */}
        <div className="controls-container">
          <div className="control-card">
            <label className="control-label">Filter by MBTI Type</label>
            <select
              value={mbtiFilter}
              onChange={(e) => setMbtiFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              {uniqueMbti.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          {/* Enneagram Dropdown Filter  */}
          <div className="control-card">
            <label className="control-label">Filter by Enneagram</label>
            <select
              value={enneagramFilter}
              onChange={(e) => setEnneagramFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              {uniqueEnneagram.map(type => (
                <option key={type} value={type}>Type {type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Controls */}
        <div className="controls-container">

          {/* Color Theme Dropdown  */}
          <div className="control-card">
            <label className="control-label">Color Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="filter-select"
            >
              {Object.entries(themes).map(([key, themeObj]) => (
                <option key={key} value={key}>{themeObj.name}</option>
              ))}
            </select>
          </div>
          
          {/* Zoom Speed scrollbar  */}
          <div className="control-card">
            <label className="control-label">
              Zoom Speed: {zoomSpeed.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.05"
              max="5"
              step="0.05"
              value={zoomSpeed}
              onChange={(e) => setZoomSpeed(Number(e.target.value))}
              className="control-slider"
            />
          </div>

          {/* Point size scrollbar  */}
          <div className="control-card" style={{'marginBottom': 32}}>
            <label className="control-label">
              Point Size: {(pointSize * 100).toFixed(0)}
            </label>
            <input
              type="range"
              min="0.005"
              max="0.1"
              step="0.005"
              value={pointSize}
              onChange={(e) => setPointSize(Number(e.target.value))}
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

      {/* Info Modal */}
      {showInfoModal && (
        <div className="modal-overlay" onClick={() => setShowInfoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowInfoModal(false)}>×</button>

            <h2 className="modal-title">About Personality Space Explorer</h2>

            <div className="modal-body">
              <section className="modal-section">
                <h3>What is this?</h3>
                <p>
                  An interactive 3D visualization of 50,000+ celebrities mapped in personality space based on their
                  MBTI types, Enneagram types, and other personality frameworks.
                </p>
              </section>

              <section className="modal-section">
                <h3>Dataset</h3>
                <p>
                  The data comes from <a href="https://www.kaggle.com/">kaggle.com</a> from this dataset: <a href="https://www.kaggle.com/datasets/yuraslastya/celeb-mbti/data">MBTI. 
                  Celebrity Personality Types</a> and special thanks to Yura Slastya for posting it. The data originally comes from 
                  <a href= "https://www.personality-database.com"> Personality Database</a>, containing personality typings for
                  celebrities, fictional characters, and public figures across multiple frameworks:
                </p>
                <ul>
                  <li><strong>MBTI</strong> (Myers-Briggs Type Indicator)</li>
                  <li><strong>Enneagram</strong> (9 personality types)</li>
                  <li><strong>Socionics</strong> (information metabolism theory)</li>
                  <li><strong>Big 5 SLOAN</strong> (trait-based model)</li>
                </ul>
              </section>

              <section className="modal-section">
                <h3>Techniques Used</h3>
                <ul>
                  <li><strong>Feature Engineering:</strong> One-hot encoding for categorical traits, continuous axis encoding for MBTI percentages</li>
                  <li><strong>Dimensionality Reduction:</strong> PCA (Principal Component Analysis) while preserving 90% variance into UMAP (Uniform Manifold Approximation and Projection) to reduce high-dimensional personality features to 3D space</li>
                  <li><strong>Clustering:</strong> HDBSCAN (Hierarchical Density-Based Spatial Clustering) to identify natural personality groupings</li>
                  <li><strong>Visualization:</strong> React Three Fiber for interactive 3D rendering with 50K+ points</li>
                </ul>
              </section>

              <section className="modal-section">
                <h3>How to Use</h3>
                <ul>
                  <li><strong>Rotate:</strong> Left-click and drag to rotate the view</li>
                  <li><strong>Pan:</strong> Right-click and drag to pan around</li>
                  <li><strong>Zoom:</strong> Scroll to zoom in/out</li>
                  <li><strong>Hover:</strong> Hover over points to see individual celebrity info</li>
                  <li><strong>Click:</strong> Click a point to select the cluster and see that celebrity's details</li>
                  <li><strong>Filter:</strong> Use sidebar filters to explore specific personality types</li>
                </ul>
              </section>

              <section className="modal-section">
                <h3>Purpose</h3>
                <p>
                  This project demonstrates how machine learning can reveal hidden patterns in personality data.
                  Points that are close together represent similar personality profiles, while clusters reveal
                  natural groupings of personality types. Explore to discover how different personality frameworks
                  relate to each other in this high-dimensional space!
                </p>
              </section>

              <section className="modal-section">
                <h3>Helpful Links</h3>
                <p style={{}}>for learning about personality metrics :)</p>
                <ul>
                  <li><strong>MBTI Types:</strong> <a href="https://www.16personalities.com/personality-types">https://www.16personalities.com/personality-types</a></li>
                  <li><strong> Enneagram Types:</strong> <a href="https://www.enneagraminstitute.com/type-descriptions/">https://www.enneagraminstitute.com/type-descriptions/</a></li>
                  <li><strong> Socionics Types:</strong> <a href="https://www.sociotype.com/socionics/types">https://www.sociotype.com/socionics/types</a></li>
                  <li><strong> Big 5 SLOAN:</strong> <a href="https://similarminds.com/global5/sloan.html">https://similarminds.com/global5/sloan.html</a></li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Right Canvas Area */}
      <div className="canvas-container">
        {/* Info Button - Top Left */}
        <button
          onClick={() => setShowInfoModal(true)}
          title="About this project"
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 1000,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: 'var(--accent-primary)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.2) rotate(180deg)'
            e.target.style.filter = 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1) rotate(0deg)'
            e.target.style.filter = 'none'
          }}
        >
          <BsFillInfoCircleFill size={32} />
        </button>

        <Canvas camera={{ position: [30, 25, 30], fov: 80}} gl={{ preserveDrawingBuffer: true }}>
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
            pointSize={pointSize}
            visiblePoints={visiblePoints}
          />
          <OrbitControls
            ref={controlsRef}
            target={[0, 6, 0]}
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
          <ScreenshotHelper onScreenshotRef={screenshotRef} />
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

          <div className = "external-data-container">
            {/* Export Icon Buttons */}
            <button
              className="icon-button"
              onClick={() => {
                if (screenshotRef.current) {
                  screenshotRef.current()
                }
              }}
              title="Save Screenshot"
            >
              <BsCamera size={20} />
            </button>
            
            <button
              className="icon-button"
              onClick={() => {
                
                // build export data using selected celebrity metadata and current cluster selection
                const exportData = {
                  timestamp: new Date().toISOString(),
                  selectedCelebrity: selectedCelebrity ? {
                    name: selectedCelebrity[1] || selectedCelebrity.name || 'Unknown',
                    category: selectedCelebrity[2] || selectedCelebrity.category,
                    subcategory: selectedCelebrity[3] || selectedCelebrity.subcategory,
                    mbti: selectedCelebrity[4] || selectedCelebrity.four_letter,
                    enneagram: selectedCelebrity[5] || selectedCelebrity.enneagram,
                    socionics: selectedCelebrity[6] || selectedCelebrity.socionics,
                    big5: selectedCelebrity[7] || selectedCelebrity.big_5_SLOAN,
                    pointIndex: selectedPoint
                  } : null,
                  selectedCluster: selectedCluster,
                  clusterInfo: selectedCluster !== null && clusterMetadata?.[selectedCluster] ? clusterMetadata[selectedCluster] : null,
                  filters: {
                    mbti: mbtiFilter,
                    enneagram: enneagramFilter
                  },
                  viewSettings: {
                    zoomLevel,
                    pointSize: (pointSize * 100).toFixed(0)
                  },
                  stats: {
                    totalPoints: data?.length || 0,
                    visiblePoints: visiblePoints ? visiblePoints.size : data?.length || 0
                  }
                };

                // Handle BigInt serialization
                const jsonString = JSON.stringify(exportData, (key, value) =>
                  typeof value === 'bigint' ? value.toString() : value
                , 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const link = document.createElement('a');
                const filename = selectedCelebrity
                  ? `celebpsyche-${(selectedCelebrity[1] || selectedCelebrity.name || 'data').replace(/\s+/g, '-')}-${Date.now()}.json`
                  : `celebpsyche-export-${Date.now()}.json`;
                link.download = filename;
                link.href = URL.createObjectURL(blob);
                link.click();
              }}
              title="Export Current Selection"
            >
              <BsDownload size={20} />
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}

export default App
