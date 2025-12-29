# Personality Space Explorer - Mobile

Mobile version of the Personality Space Explorer built with React Native and Expo.

## Features

- 🎨 **3D Visualization** - Interactive 3D point cloud rendering using Three.js and expo-gl
- 🔍 **Search** - Find celebrities by name
- 📊 **Cluster Analysis** - View personality clusters and their metadata
- 🎭 **Celebrity Details** - Explore MBTI, Enneagram, and other personality frameworks
- 📱 **Mobile Optimized** - Responsive design for iOS and Android
- 🌗 **Dark Theme** - Sleek dark UI matching the web version

## Tech Stack

- **React Native** 0.81.5
- **Expo** 54
- **Three.js** - 3D rendering
- **expo-gl** - WebGL context for Three.js
- **expo-three** - Three.js integration for React Native
- **hyparquet** - Parquet file reading

## Getting Started

### Prerequisites

- Node.js >= 20.19.4
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
cd apps/mobile
npm install
```

### Running the App

**IMPORTANT:** Before starting the app, you need to run the data server:

```bash
# Step 1: Convert Parquet files to JSON (only needed once)
python3 scripts/convert_parquet_to_json.py

# Step 2: Start the local data server (keep this running)
python3 scripts/serve_mobile_data.py
```

Then in a **new terminal**, start the mobile app:

```bash
# Navigate to mobile directory
cd apps/mobile

# Start Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run in web browser
npm run web
```

The app will fetch data from the local server at `http://localhost:8080`.

## Project Structure

```
apps/mobile/
├── App.js              # Main application component
├── utils/
│   └── ReadParquet.js  # Parquet data loading utilities
├── assets/             # Images and static assets
├── package.json
└── README.md
```

## Features in Detail

### 3D Visualization
- Point cloud rendering with 50K+ data points
- Color-coded clusters
- Real-time rendering with expo-gl
- Touch gestures for camera control

### Search Functionality
- Search celebrities by name
- Real-time search results
- Highlight selected points in 3D space

### Sidebar
- Toggleable sidebar for mobile optimization
- Celebrity information cards
- Cluster details
- Search interface

### Info Modal
- Project information
- Dataset credits
- Usage instructions

## Data Files

The app loads data from a local development server:
- `embedding.json` - 3D coordinates (50K+ points)
- `clusters.json` - Cluster assignments
- `metadata.json` - Celebrity metadata (names, MBTI, Enneagram, etc.)
- `cluster_metadata.json` - Cluster descriptions

These JSON files are generated from the original Parquet files using the conversion script.

## Performance

- Optimized for mobile devices
- Efficient point cloud rendering
- Lazy loading of data
- Responsive UI with smooth animations

## Author

**Matthew Davis**

## License

Private - All Rights Reserved
