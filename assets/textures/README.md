# Procedural Asset Generation

This project now uses procedural generation instead of external assets:

## Textures
All textures are generated programmatically using Three.js:
- Terrain textures using procedural noise patterns
- Particle effects using custom shaders
- Material properties defined in code

## Models
All models are created using Three.js geometry primitives:
- Vehicle using BoxGeometry and CylinderGeometry
- Buildings using procedural generation
- Obstacles using basic Three.js shapes

## Audio
Sound effects are generated using the Web Audio API:
- Engine sounds using oscillators and filters
- Collision sounds using synthesized effects
- Environmental audio using procedural generation

## Benefits
- No external dependencies
- Faster loading times
- Smaller project size
- Fully customizable through code
- Better performance optimization
