# 3D Maze Shooter

A mobile-optimized 3D maze shooter game built with Three.js.

## Performance-First Mobile Optimizations

This game has been optimized for mobile devices with the following performance-focused features:

### Mobile Controls
- Virtual joystick for movement
- Touch camera controls
- Action buttons for shooting, jumping, and reloading
- Responsive UI that adapts to different screen sizes

### Performance Optimizations
- Automatic quality scaling based on device performance
- Pixel ratio optimization for mobile devices
- Reduced view distance on lower-end devices
- Object pooling for bullets and effects
- Memory management for Three.js objects
- Simplified materials and effects for better performance

### Visual Feedback
- Color-based hit feedback instead of complex effects
- Minimal screen shake
- Simple UI transitions
- Vibration API support (when available)
- Aim assist for mobile players

## Development

### Prerequisites
- Node.js (v16+)
- npm or yarn

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm start
```

### Building for Production
```bash
# Build optimized version
npm run build

# Preview production build
npm run preview
```

## Mobile Target Specs
- 60 FPS on modern mobile devices
- 30+ FPS on older phones
- Fast startup (<3 seconds)
- Low memory usage

## Implemented Recommendations
1. Responsive touch controls
   - Virtual joystick
   - Touch camera rotation
   - Action buttons

2. Performance monitoring
   - FPS tracking
   - Auto quality adjustment
   - Device capability detection

3. Memory management
   - Object pooling
   - Three.js resource disposal
   - Simplified geometries

4. Mobile-friendly gameplay
   - Aim assist
   - Larger hit areas
   - Simplified effects
   - Better feedback

## License
MIT 