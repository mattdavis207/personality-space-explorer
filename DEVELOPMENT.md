# Personality Space Explorer - Development Guide

## Project Structure

```
personality-space-explorer/
├── apps/
│   ├── web/          # Web app (Three.js + React + Vite)
│   └── mobile/       # Mobile app (React Native + Expo)
├── ml_pipeline/      # Python ML scripts
├── artifacts/        # Generated data (embeddings, clusters, metadata)
└── data/            # Raw data
```

## Development Environments

### Web App (Three.js + React + Vite)

**Tech Stack:**
- React 18
- Three.js - 3D graphics library
- @react-three/fiber - React renderer for Three.js
- @react-three/drei - Useful helpers for R3F
- Vite - Fast build tool

**Getting Started:**

```bash
cd apps/web
npm install
npm run dev
```

The web app will be available at `http://localhost:5173`

**Key Libraries:**
- `three` - Core Three.js library for 3D visualization
- `@react-three/fiber` - Declarative Three.js in React
- `@react-three/drei` - Helpers (OrbitControls, Stats, etc.)

**Useful Resources:**
- Three.js docs: https://threejs.org/docs/
- React Three Fiber docs: https://docs.pmnd.rs/react-three-fiber/
- Drei docs: https://github.com/pmndrs/drei

---

### Mobile App (React Native + Expo)

**Tech Stack:**
- React Native
- Expo SDK
- expo-gl - OpenGL bindings for React Native
- expo-three - Three.js adapter for Expo
- three - Three.js core

**Getting Started:**

```bash
cd apps/mobile
npm install
npm start
```

This will start Expo Dev Tools. You can then:
- Press `i` to run on iOS simulator (requires macOS + Xcode)
- Press `a` to run on Android emulator (requires Android Studio)
- Scan QR code with Expo Go app on your physical device

**Key Libraries:**
- `expo-gl` - Provides WebGL context in React Native
- `expo-three` - Adapter for using Three.js with Expo
- `three` - Same Three.js library as web

**Useful Resources:**
- Expo docs: https://docs.expo.dev/
- React Native docs: https://reactnative.dev/docs/getting-started
- expo-three: https://github.com/expo/expo-three

---

## Building Your 3D Visualization

### Loading Your Data

Your personality data is in `/artifacts`:
- `embedding.parquet` - 3D coordinates (x, y, z) for each point
- `clusters.parquet` - Cluster assignments
- `metadata.parquet` - Celebrity names, MBTI types, etc.
- `cluster_metadata.json` - Cluster labels and statistics

### Web App Example

```jsx
// In apps/web/src/App.jsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'

function PersonalityGalaxy() {
  // Load your parquet data here
  // const points = loadEmbedding()

  return (
    <Canvas camera={{ position: [0, 0, 50], fov: 75 }}>
      <ambientLight intensity={0.5} />
      <OrbitControls />
      <Stats />

      {/* Render your 50k points as particles/instances here */}
      {/* Example: <Points positions={points} colors={clusterColors} /> */}
    </Canvas>
  )
}
```

### Mobile App Example

```jsx
// In apps/mobile/App.js
import { GLView } from 'expo-gl'
import { Renderer } from 'expo-three'
import * as THREE from 'three'

export default function App() {
  const onContextCreate = async (gl) => {
    const renderer = new Renderer({ gl })
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 1000)

    // Load your data and create particle system here

    const animate = () => {
      requestAnimationFrame(animate)
      renderer.render(scene, camera)
      gl.endFrameEXP()
    }
    animate()
  }

  return <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
}
```

### Performance Tips for 50k Points

1. **Use InstancedMesh or Points** - Don't create 50k individual meshes
2. **Implement LOD** - Show fewer points when zoomed out
3. **Use BufferGeometry** - More efficient than regular Geometry
4. **Frustum culling** - Only render visible points
5. **Use Web Workers** - Load/parse parquet files off main thread

### Reading Parquet Files in JavaScript

You'll need to add a parquet reader:

**For Web:**
```bash
cd apps/web
npm install parquetjs-lite  # or apache-arrow
```

**For Mobile:**
```bash
cd apps/mobile
npm install parquetjs-lite
```

---

## Next Steps

1. **Load your data** - Read the parquet files from `/artifacts`
2. **Create particle system** - Render 50k points efficiently
3. **Add colors** - Color points by cluster using `cluster_metadata.json`
4. **Add interactivity** - Click points to show celebrity details
5. **Add labels** - Show cluster labels in 3D space
6. **Polish** - Smooth camera movements, beautiful colors, etc.

---

## Commands Reference

### Web App
```bash
cd apps/web
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Mobile App
```bash
cd apps/mobile
npm start            # Start Expo dev server
npm run android      # Run on Android
npm run ios          # Run on iOS
npm run web          # Run as web app
```

### ML Pipeline
```bash
python ml_pipeline/build_features.py     # Generate features
python ml_pipeline/fit_embedding.py      # PCA + UMAP
python ml_pipeline/fit_clusters.py       # HDBSCAN clustering
```

---

## Troubleshooting

**Node version warnings:** You're on v20.18.0, some packages want v20.19+. This is fine - warnings can be ignored, everything will work.

**Module not found errors:** Make sure you're in the right directory (`apps/web` or `apps/mobile`)

**Expo Go app limits:** If you run into limitations with Expo Go app, you can create a development build: `npx expo run:ios` or `npx expo run:android`

---

## Architecture Recommendations

### Shared Logic (Optional)
Consider creating a `/shared` folder for:
- Data loading utilities
- Color schemes for clusters
- Type definitions
- Constants (cluster colors, sizes, etc.)

### State Management
For complex interactions, consider:
- **Web**: Zustand or Jotai (lightweight)
- **Mobile**: React Context or Zustand

### File Format
Parquet is great for Python, but for web/mobile you might also want to:
1. Convert to JSON for smaller datasets
2. Use MessagePack for binary efficiency
3. Split into chunks for progressive loading

---

Happy coding! You're about to build an amazing 3D personality galaxy! 🌌