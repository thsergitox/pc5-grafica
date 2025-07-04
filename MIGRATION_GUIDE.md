# SwipeMath to SwipeMath AR Migration Guide

## Project Overview

This guide documents the transformation of SwipeMath from a React-based touch/swipe game into an Augmented Reality (AR) experience using Three.js and MindAR. The AR version maintains all core game logic while replacing cursor/touch interactions with physical marker movements.

## Original Project: SwipeMath (React)
- **Location**: `~/projects/SwipeMath`
- **Tech Stack**: React 18.2, Vite, Tailwind CSS
- **Interaction**: Drag-and-drop or swipe gestures
- **Purpose**: Educational math game for children aged 6-8

## AR Project: SwipeMath AR
- **Location**: `/home/andre/uni/25-1/grafica/pc5-grafica`
- **Tech Stack**: Flask, Three.js, MindAR.js, Vanilla JavaScript
- **Interaction**: Physical AR marker movement
- **Purpose**: Same educational goal with immersive AR experience

## Core Concepts Migration

### 1. Game Logic Preservation

The core game mechanics remain identical:
- **Timer System**: Ticks countdown (100ms per tick)
- **Round Types**: Alternating ADD (growth) and SUBTRACT (challenge) rounds
- **Scoring**: Points based on seconds added to timer
- **Difficulty Progression**: Level-based with increasing complexity

### 2. Input Method Transformation

**React Version** (Drag & Drop):
```javascript
// From SwipeMath React
const handleDrag = (e, data) => {
  const { x } = data;
  if (x < -threshold) selectOperation('left');
  if (x > threshold) selectOperation('right');
};
```

**AR Version** (Marker Tracking):
```javascript
// In SwipeMath AR
const markerPosition = anchor.group.position;
const screenX = (markerPosition.x + 1) / 2; // Normalize to 0-1
if (screenX < 0.3) selectOperation('left');
if (screenX > 0.7) selectOperation('right');
```

### 3. Visual Feedback Adaptation

**React**: Direct UI manipulation with CSS transitions
**AR**: Overlay UI elements with transparency for AR visibility

Key differences:
- AR uses semi-transparent backgrounds (`rgba`) to maintain camera feed visibility
- Position indicators replace drag animations
- 3D character (Stitch) provides visual feedback through positioning

## Technical Implementation Guide

### Step 1: Setting Up AR Framework

1. **Initialize MindAR**:
```javascript
const mindarThree = new window.MINDAR.IMAGE.MindARThree({
  container: document.querySelector("#ar-container"),
  imageTargetSrc: "./assets/targets/carnet.mind",
  maxTrack: 1,
  uiLoading: "yes",
  uiScanning: "yes",
  uiError: "yes"
});
```

2. **Create AR Scene**:
```javascript
const { renderer, scene, camera } = mindarThree;
// Mirror the camera for natural interaction
renderer.domElement.style.transform = "scaleX(-1)";
```

### Step 2: Migrating Game State

**React State Management**:
```javascript
// useGameState.js in React
const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
const [score, setScore] = useState(0);
const [level, setLevel] = useState(1);
```

**AR Implementation**:
```javascript
// Global state in AR version
let gameState = {
  ticks: gameConfig.difficultySettings.initialTicks,
  score: 0,
  level: 1,
  roundType: 'ADD',
  isPlaying: false
};
```

### Step 3: Implementing AR-Specific Features

1. **Marker Detection & Tracking**:
```javascript
anchor.group.add(stitchModel);
anchor.onTargetFound = () => {
  console.log("Marker detected");
  updateDetectionIndicator(true);
};
anchor.onTargetLost = () => {
  console.log("Marker lost");
  updateDetectionIndicator(false);
};
```

2. **Position-Based Selection**:
```javascript
function checkMarkerPosition() {
  if (!stitchModel || !markerDetected) return;
  
  const markerPosition = anchor.group.position;
  const threshold = 0.2;
  
  if (markerPosition.x < -threshold) {
    handleSideSelection('left');
  } else if (markerPosition.x > threshold) {
    handleSideSelection('right');
  }
}
```

3. **Confirmation Delay System**:
```javascript
let confirmationTimer = null;
const CONFIRMATION_DELAY = 500; // ms

function handleSideSelection(side) {
  if (confirmationTimer) clearTimeout(confirmationTimer);
  
  highlightCard(side);
  confirmationTimer = setTimeout(() => {
    makeChoice(side === 'left' ? 0 : 1);
  }, CONFIRMATION_DELAY);
}
```

### Step 4: UI Overlay Design

**HTML Structure**:
```html
<div id="ar-container">
  <div id="game-ui" class="overlay">
    <div id="round-type">GROW</div>
    <div id="central-number">12</div>
    <div id="operation-cards">
      <div class="operation-card left">+5</div>
      <div class="operation-card right">×2</div>
    </div>
    <div id="time-bar"></div>
    <div id="score-display">Score: 0</div>
  </div>
</div>
```

**CSS for AR Visibility**:
```css
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.operation-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(5px);
}
```

## Resource Migration Checklist

### From React Project:
- [x] Game logic algorithms (number generation, scoring)
- [x] Difficulty progression system
- [x] Round type alternation
- [x] Timer mechanics
- [x] Sound effects integration

### AR-Specific Additions:
- [x] AR marker file (`.mind` format)
- [x] 3D model (Stitch character in GLTF)
- [x] MindAR and Three.js libraries
- [x] Camera permission handling
- [x] Marker tracking logic

## Key Considerations

### 1. Performance Optimization
- AR rendering is resource-intensive
- Minimize complex animations
- Use efficient 3D models (low poly count)
- Optimize texture sizes

### 2. User Experience
- Clear visual indicators for marker detection
- Adequate confirmation delays to prevent accidental selections
- Audio feedback for actions (crucial when focusing on marker)
- Simple, readable UI overlays

### 3. Physical Interaction Design
- Consider marker size and printability
- Test different lighting conditions
- Account for hand stability (especially for children)
- Provide clear movement instructions

## Testing Checklist

- [ ] Marker detection in various lighting
- [ ] Smooth position tracking
- [ ] Accurate left/right selection
- [ ] Game logic consistency with React version
- [ ] Audio synchronization
- [ ] Performance on target devices
- [ ] Clear UI visibility over AR content

## Future Enhancements

1. **Multiple Markers**: Different characters for different operations
2. **Gesture Recognition**: Hand gestures for special moves
3. **Multiplayer AR**: Shared AR space for competitive play
4. **Dynamic 3D Feedback**: Character animations based on performance
5. **AR Effects**: Particle effects for correct answers

## Conclusion

The migration from SwipeMath to SwipeMath AR demonstrates how traditional educational games can be transformed into immersive AR experiences. While the core educational value remains unchanged, the physical interaction through AR markers creates a more engaging and memorable learning experience for children.

The key to successful migration is maintaining the proven game mechanics while adapting the interaction model to leverage AR's unique capabilities. This project serves as a template for converting other educational applications into AR experiences using modern web technologies.