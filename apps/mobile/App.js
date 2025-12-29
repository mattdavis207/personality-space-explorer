import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Modal, Dimensions, ActivityIndicator, PanResponder } from 'react-native';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { useState, useRef, useEffect, useMemo } from 'react';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { useParquetData, useJsonData } from './utils/ReadParquet';

const { width, height } = Dimensions.get('window');

// Theme colors
const colors = {
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
};

// Generate distinct colors for each cluster
function getClusterColor(clusterLabel) {
  const hue = (Number(clusterLabel) * 137.508) % 360;
  const saturation = 0.7;
  const lightness = 0.6;

  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - c / 2;

  let r, g, b;
  if (hue < 60) { r = c; g = x; b = 0; }
  else if (hue < 120) { r = x; g = c; b = 0; }
  else if (hue < 180) { r = 0; g = c; b = x; }
  else if (hue < 240) { r = 0; g = x; b = c; }
  else if (hue < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return new THREE.Color(r + m, g + m, b + m);
}

export default function App() {
  // Load real data from JSON files served by local development server
  // To start the server: python3 scripts/serve_mobile_data.py
  // NOTE: Use your machine's local IP instead of 'localhost' for iOS Simulator
  const DATA_URL = 'http://192.168.0.166:8080';

  const { data: embeddingData, loading: embeddingLoading, error: embeddingError } = useParquetData(`${DATA_URL}/embedding.json`);
  const { data: clusterData, loading: clusterLoading, error: clusterError } = useParquetData(`${DATA_URL}/clusters.json`);
  const { data: metadataData, loading: metadataLoading, error: metadataError } = useParquetData(`${DATA_URL}/metadata.json`, true);
  const { data: clusterMetadata, loading: clusterMetadataLoading } = useJsonData(`${DATA_URL}/cluster_metadata.json`);

  const [selectedCluster, setSelectedCluster] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedCelebrity, setSelectedCelebrity] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mbtiFilter, setMbtiFilter] = useState('all');
  const [enneagramFilter, setEnneagramFilter] = useState('all');

  // Check if data is still loading
  const loading = embeddingLoading || clusterLoading || metadataLoading || clusterMetadataLoading;
  const error = embeddingError || clusterError || metadataError;

  // Assign loaded data
  const data = embeddingData;
  const celebrityMetadata = metadataData;

  // Debug logging
  useEffect(() => {
    console.log('Loading state:', {
      embeddingLoading,
      clusterLoading,
      metadataLoading,
      clusterMetadataLoading,
      loading
    });
    console.log('Error state:', { embeddingError, clusterError, metadataError, error });
    console.log('Data loaded:', {
      embeddingData: embeddingData?.length,
      clusterData: clusterData?.length,
      metadataData: metadataData?.length
    });
  }, [loading, error, embeddingData, clusterData, metadataData]);

  const glRef = useRef();
  const rendererRef = useRef();
  const sceneRef = useRef();
  const cameraRef = useRef();
  const pointsRef = useRef();

  // Camera control state
  const [cameraDistance, setCameraDistance] = useState(50);
  const [cameraRotation, setCameraRotation] = useState({ theta: 0.8, phi: 0.6 });
  const [pointSize, setPointSize] = useState(0.15);
  const [zoomSensitivity, setZoomSensitivity] = useState(0.1);
  const lastTouchRef = useRef({ x: 0, y: 0, distance: 0 });
  const isDraggingRef = useRef(false);

  // Reset camera to default position
  const resetCamera = () => {
    setCameraDistance(50);
    setCameraRotation({ theta: 0.8, phi: 0.6 });
  };

  // Extract unique filters
  const { uniqueMbti, uniqueEnneagram } = useMemo(() => {
    if (!celebrityMetadata) return { uniqueMbti: [], uniqueEnneagram: [] };

    const mbtiSet = new Set();
    const enneagramSet = new Set();

    celebrityMetadata.forEach(celeb => {
      const mbti = celeb[4];
      const enneagram = celeb[5];
      if (mbti) mbtiSet.add(mbti);
      if (enneagram) enneagramSet.add(enneagram);
    });

    return {
      uniqueMbti: Array.from(mbtiSet).sort(),
      uniqueEnneagram: Array.from(enneagramSet).sort()
    };
  }, [celebrityMetadata]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim() || !celebrityMetadata) {
      setSearchResult(null);
      return;
    }

    const searchLower = query.toLowerCase().trim();
    const foundIndex = celebrityMetadata.findIndex(celeb => {
      const name = celeb[1] || '';
      return name.toLowerCase().includes(searchLower);
    });

    if (foundIndex !== -1) {
      const celebrity = celebrityMetadata[foundIndex];
      const name = celebrity[1] || 'Unknown';
      setSearchResult({ found: true, index: foundIndex, name });
      setSelectedPoint(foundIndex);
      setSelectedCelebrity(celebrity);
      if (clusterData && clusterData[foundIndex]) {
        setSelectedCluster(clusterData[foundIndex][0]);
      }
    } else {
      setSearchResult({ found: false });
      setSelectedPoint(null);
      setSelectedCelebrity(null);
    }
  };

  // Update camera position based on rotation and distance
  useEffect(() => {
    if (!cameraRef.current) return;

    const camera = cameraRef.current;
    const theta = cameraRotation.theta;
    const phi = cameraRotation.phi;

    camera.position.x = cameraDistance * Math.sin(theta) * Math.cos(phi);
    camera.position.y = cameraDistance * Math.sin(phi);
    camera.position.z = cameraDistance * Math.cos(theta) * Math.cos(phi);
    camera.lookAt(0, 0, 0);
  }, [cameraDistance, cameraRotation]);

  const onContextCreate = async (gl) => {
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.bgPrimary);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    // Set initial camera position based on state
    const theta = cameraRotation.theta;
    const phi = cameraRotation.phi;
    camera.position.x = cameraDistance * Math.sin(theta) * Math.cos(phi);
    camera.position.y = cameraDistance * Math.sin(phi);
    camera.position.z = cameraDistance * Math.cos(theta) * Math.cos(phi);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Render loop
    const render = () => {
      requestAnimationFrame(render);
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  // Pan responder for touch controls
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        isDraggingRef.current = true;
        const touch = evt.nativeEvent;
        lastTouchRef.current = { x: touch.pageX, y: touch.pageY };

        // Check for pinch (two fingers)
        if (evt.nativeEvent.touches && evt.nativeEvent.touches.length === 2) {
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) +
            Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          lastTouchRef.current.distance = distance;
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        const touch = evt.nativeEvent;

        // Pinch zoom with two fingers
        if (evt.nativeEvent.touches && evt.nativeEvent.touches.length === 2) {
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) +
            Math.pow(touch2.pageY - touch1.pageY, 2)
          );

          if (lastTouchRef.current.distance > 0) {
            const delta = distance - lastTouchRef.current.distance;
            setCameraDistance(prev => Math.max(5, Math.min(300, prev - delta * zoomSensitivity)));
          }
          lastTouchRef.current.distance = distance;
        }
        // Single finger rotation
        else {
          const deltaX = touch.pageX - lastTouchRef.current.x;
          const deltaY = touch.pageY - lastTouchRef.current.y;

          setCameraRotation(prev => ({
            theta: prev.theta - deltaX * 0.01,
            phi: Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, prev.phi - deltaY * 0.01))
          }));

          lastTouchRef.current = { x: touch.pageX, y: touch.pageY };
        }
      },

      onPanResponderRelease: () => {
        isDraggingRef.current = false;
      }
    })
  ).current;

  useEffect(() => {
    if (!data || !sceneRef.current || data.length === 0) {
      console.log('Waiting for data or scene...', {
        hasData: !!data,
        hasScene: !!sceneRef.current,
        dataLength: data?.length
      });
      return;
    }

    console.log('Creating 3D points...', { dataLength: data.length });

    // Remove old points
    if (pointsRef.current) {
      sceneRef.current.remove(pointsRef.current);
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(data.length * 3);
    const colorsArray = new Float32Array(data.length * 3);

    data.forEach((point, i) => {
      positions[i * 3] = point[0];
      positions[i * 3 + 1] = point[1];
      positions[i * 3 + 2] = point[2];

      let color;
      if (clusterData && clusterData[i]) {
        const clusterLabel = clusterData[i][0];
        if (selectedPoint === i) {
          color = new THREE.Color(0, 1, 1);
        } else if (selectedCluster !== null && clusterLabel !== selectedCluster) {
          color = new THREE.Color(0.2, 0.2, 0.2);
        } else {
          color = getClusterColor(clusterLabel);
        }
      } else {
        const normalizedX = (point[0] + 20) / 40;
        const normalizedY = (point[1] + 20) / 40;
        const normalizedZ = (point[2] + 20) / 40;
        color = new THREE.Color(normalizedX, normalizedY, normalizedZ);
      }

      colorsArray[i * 3] = color.r;
      colorsArray[i * 3 + 1] = color.g;
      colorsArray[i * 3 + 2] = color.b;
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

    const material = new THREE.PointsMaterial({
      size: pointSize,
      vertexColors: true,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    pointsRef.current = points;
    sceneRef.current.add(points);

    console.log('3D points created and added to scene');

  }, [data, clusterData, selectedCluster, selectedPoint, pointSize]);

  // Show loading screen
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.accentPrimary} />
        <Text style={styles.loadingText}>Loading celebrity data...</Text>
      </View>
    );
  }

  // Show error screen
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar style="light" />
        <Text style={styles.errorText}>Error loading data: {error}</Text>
        <Text style={styles.errorSubtext}>
          Make sure the data server is running:{'\n\n'}
          1. Convert Parquet to JSON (if not done):{'\n'}
             python3 scripts/convert_parquet_to_json.py{'\n\n'}
          2. Start the data server:{'\n'}
             python3 scripts/serve_mobile_data.py{'\n\n'}
          3. Reload the app
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* 3D Canvas */}
      <View style={styles.canvas} {...panResponder.panHandlers}>
        <GLView
          style={{ flex: 1 }}
          onContextCreate={onContextCreate}
        />
      </View>

      {/* Info Button */}
      <TouchableOpacity
        style={styles.infoButton}
        onPress={() => setShowInfoModal(true)}
      >
        <Text style={styles.infoButtonText}>ℹ</Text>
      </TouchableOpacity>

      {/* Sidebar Toggle */}
      <TouchableOpacity
        style={styles.sidebarToggle}
        onPress={() => setSidebarOpen(!sidebarOpen)}
      >
        <Text style={styles.sidebarToggleText}>{sidebarOpen ? '✕' : '☰'}</Text>
      </TouchableOpacity>

      {/* Sidebar */}
      {sidebarOpen && (
        <View style={styles.sidebar}>
          <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={true}>
            <Text style={styles.sidebarTitle}>Personality Space{'\n'}Explorer</Text>

            {/* Search */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {searchResult && (
                <View style={[styles.searchResult, searchResult.found ? styles.searchResultFound : styles.searchResultNotFound]}>
                  <Text style={styles.searchResultText}>
                    {searchResult.found ? `Found: ${searchResult.name}` : 'Not found'}
                  </Text>
                </View>
              )}
            </View>

            {/* Filters */}
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>MBTI Filter:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={mbtiFilter}
                  style={styles.picker}
                  onValueChange={(value) => setMbtiFilter(value)}
                >
                  <Picker.Item label="All Types" value="all" />
                  {uniqueMbti.map(type => (
                    <Picker.Item key={type} label={type} value={type} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.filterLabel}>Enneagram Filter:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={enneagramFilter}
                  style={styles.picker}
                  onValueChange={(value) => setEnneagramFilter(value)}
                >
                  <Picker.Item label="All Types" value="all" />
                  {uniqueEnneagram.map(type => (
                    <Picker.Item key={type} label={`Type ${type}`} value={type} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Cluster Selection */}
            {clusterMetadata && Object.keys(clusterMetadata).length > 0 && (
              <View style={styles.clusterListContainer}>
                <Text style={styles.clusterListTitle}>Clusters (tap to filter)</Text>
                <ScrollView style={styles.clusterList} nestedScrollEnabled={true}>
                  {Object.keys(clusterMetadata).sort((a, b) => Number(a) - Number(b)).map(clusterId => {
                    const cluster = clusterMetadata[clusterId];
                    const isSelected = selectedCluster === Number(clusterId);
                    return (
                      <TouchableOpacity
                        key={clusterId}
                        style={[styles.clusterListItem, isSelected && styles.clusterListItemSelected]}
                        onPress={() => setSelectedCluster(isSelected ? null : Number(clusterId))}
                      >
                        <View style={[styles.clusterColorDot, { backgroundColor: `#${getClusterColor(Number(clusterId)).getHexString()}` }]} />
                        <View style={styles.clusterListItemContent}>
                          <Text style={[styles.clusterListItemTitle, isSelected && styles.clusterListItemTitleSelected]}>
                            Cluster {clusterId}
                          </Text>
                          <Text style={styles.clusterListItemLabel} numberOfLines={2}>
                            {cluster.label || cluster.description || 'No description'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Camera Controls */}
            <View style={styles.controlsContainer}>
              <Text style={styles.controlsTitle}>Camera Controls</Text>

              <TouchableOpacity style={styles.resetButton} onPress={resetCamera}>
                <Text style={styles.resetButtonText}>Reset Camera</Text>
              </TouchableOpacity>

              <Text style={styles.sliderLabel}>Point Size: {pointSize.toFixed(2)}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.01}
                maximumValue={0.5}
                step={0.01}
                value={pointSize}
                onValueChange={setPointSize}
                minimumTrackTintColor={colors.accentPrimary}
                maximumTrackTintColor={colors.borderColor}
                thumbTintColor={colors.accentPrimary}
              />

              <Text style={styles.sliderLabel}>Zoom Sensitivity: {zoomSensitivity.toFixed(2)}</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.01}
                maximumValue={0.5}
                step={0.01}
                value={zoomSensitivity}
                onValueChange={setZoomSensitivity}
                minimumTrackTintColor={colors.accentPrimary}
                maximumTrackTintColor={colors.borderColor}
                thumbTintColor={colors.accentPrimary}
              />
            </View>

            {/* Selected Celebrity */}
            {selectedCelebrity && (
              <View style={styles.celebrityCard}>
                <Text style={styles.celebrityName}>{selectedCelebrity[1] || 'Unknown'}</Text>
                {selectedCelebrity[2] && <Text style={styles.celebrityInfo}>Category: {selectedCelebrity[2]}</Text>}
                {selectedCelebrity[4] && <Text style={styles.celebrityInfo}>MBTI: {selectedCelebrity[4]}</Text>}
                {selectedCelebrity[5] && <Text style={styles.celebrityInfo}>Enneagram: {selectedCelebrity[5]}</Text>}
                <TouchableOpacity onPress={() => {
                  setSelectedCelebrity(null);
                  setSelectedPoint(null);
                }}>
                  <Text style={styles.closeButton}>Deselect</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Cluster Info */}
            {selectedCluster !== null && (
              <View style={styles.clusterCard}>
                <Text style={styles.clusterTitle}>Cluster {selectedCluster}</Text>
                {clusterMetadata && clusterMetadata[selectedCluster] && (
                  <Text style={styles.clusterDescription}>
                    {clusterMetadata[selectedCluster].label || clusterMetadata[selectedCluster].description || 'No description available'}
                  </Text>
                )}
                <TouchableOpacity onPress={() => setSelectedCluster(null)}>
                  <Text style={styles.closeButton}>Deselect Cluster</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Personality Space Explorer</Text>
              <Text style={styles.modalText}>
                An interactive 3D visualization of 1,000 sample celebrities mapped in personality space based on MBTI, Enneagram, and other frameworks.
              </Text>
              <Text style={styles.modalText}>
                This is a demo with sample data. The full version with 50K+ celebrities is available on web.
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowInfoModal(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  canvas: {
    flex: 1,
  },
  infoButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accentPrimary,
  },
  infoButtonText: {
    fontSize: 24,
    color: colors.accentPrimary,
    fontWeight: 'bold',
  },
  sidebarToggle: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accentPrimary,
    zIndex: 1000,
    elevation: 20,
  },
  sidebarToggleText: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: width * 0.85,
    height: height,
    backgroundColor: colors.bgSecondary,
    padding: 20,
    paddingTop: 60,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 10,
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.accentPrimary,
    marginBottom: 20,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: colors.bgPrimary,
    color: colors.textPrimary,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.borderColor,
  },
  searchResult: {
    marginTop: 8,
    padding: 8,
    borderRadius: 4,
  },
  searchResultFound: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  searchResultNotFound: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  searchResultText: {
    color: colors.textPrimary,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 8,
    marginTop: 8,
  },
  pickerContainer: {
    backgroundColor: colors.bgPrimary,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.borderColor,
    overflow: 'hidden',
  },
  picker: {
    color: colors.textPrimary,
    height: 50,
  },
  celebrityCard: {
    backgroundColor: colors.bgTertiary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.accentPrimary,
  },
  celebrityName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.accentPrimary,
    marginBottom: 8,
  },
  celebrityInfo: {
    color: colors.textPrimary,
    marginBottom: 4,
  },
  clusterCard: {
    backgroundColor: colors.bgTertiary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  clusterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accentPrimary,
    marginBottom: 8,
  },
  clusterDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  clusterListContainer: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  clusterListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  clusterList: {
    maxHeight: 300,
  },
  clusterListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.bgTertiary,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  clusterListItemSelected: {
    borderColor: colors.accentPrimary,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  clusterColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  clusterListItemContent: {
    flex: 1,
  },
  clusterListItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  clusterListItemTitleSelected: {
    color: colors.accentPrimary,
  },
  clusterListItemLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  controlsContainer: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderColor,
  },
  controlsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  resetButton: {
    backgroundColor: colors.accentPrimary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  resetButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  sliderLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  closeButton: {
    color: colors.accentSecondary,
    marginTop: 8,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.bgSecondary,
    padding: 24,
    borderRadius: 16,
    width: width * 0.9,
    maxHeight: height * 0.8,
    borderWidth: 2,
    borderColor: colors.accentPrimary,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.accentPrimary,
    marginBottom: 16,
  },
  modalText: {
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  modalCloseButton: {
    backgroundColor: colors.accentPrimary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 18,
    marginTop: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorSubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
