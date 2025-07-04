# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SwipeMath AR - An educational Augmented Reality math game for children aged 6-8. Players use physical AR markers to control a 3D Stitch character and solve math operations.

## Tech Stack

- **Backend**: Flask 3.0.3 (Python web framework)
- **Frontend**: JavaScript with MindAR.js (AR tracking) and Three.js (3D rendering)
- **Deployment**: Configured for Heroku via Procfile

## Development Commands

```bash
# Setup virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run locally
python main.py
# Access at http://127.0.0.1:5000
```

## Architecture Overview

### Backend Structure
- `main.py`: Flask server that serves the single-page AR application
- Simple routing with one main endpoint serving `templates/main_html.html`

### Frontend Architecture
- **AR System**: Uses MindAR.js for image-based marker tracking
- **3D Rendering**: Three.js for displaying 3D models (Stitch character)
- **Game Logic**: Located in `static/main.js` with:
  - Difficulty progression system (levels increase operation complexity)
  - Timer-based gameplay with tick system
  - Score tracking and level progression
  - Sound feedback system for user actions

### Key Game Configuration
Game difficulty can be adjusted in `main.js` via the `gameConfig.difficultySettings` object:
- `initialTicks`: Starting time (200 = 20 seconds)
- `correctChoiceTickBonus`: Time bonus for correct answers
- `alpha` parameters: Control operation difficulty scaling

### Asset Organization
- `static/assets/models/`: 3D models (GLTF format)
- `static/assets/sounds/`: Audio feedback files
- `static/assets/targets/`: AR marker files (.mind format)
- `static/libs/`: JavaScript libraries (MindAR, Three.js, etc.)

## Development Notes

- AR marker detection triggers game choices - moving the physical card left/right selects operations
- Game uses a confirmation delay system to prevent accidental selections
- Sound effects provide immediate feedback for correct/incorrect choices
- The frontend is designed to overlay AR content with game UI elements