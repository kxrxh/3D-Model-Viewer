# 3D Model Viewer

A mobile-friendly 3D model viewer for GLB files built with React, TypeScript, and Three.js.

## Features

- Model selection screen with pre-loaded models
- Upload and view GLB 3D models
- Mobile-responsive design
- Touch gestures for camera control (pan, zoom, rotate)
- High-performance rendering with Three.js
- Modern, clean UI

## Getting Started

### Prerequisites

- Bun (or npm/yarn)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
bun install
```

3. Run the development server:

```bash
bun dev
```

4. Open your browser to the provided URL (usually `http://localhost:5173`)

## Usage

1. Open the application on your mobile device or desktop browser
2. On the initial screen, select one of the available 3D models or upload your own
3. Once a model is selected, it will be displayed in the viewer
4. Use touch gestures (or mouse on desktop) to:
   - Rotate: One finger drag (or left mouse button)
   - Pan: Two finger drag (or right mouse button)
   - Zoom: Pinch gesture (or mouse wheel)
5. You can return to the model selection screen at any time by clicking "Choose Different Model"

## Default Model

The app includes a default model that will be displayed until you upload your own.

## Technologies Used

- React
- TypeScript
- Three.js
- React Three Fiber & Drei
- Vite

## License

MIT
