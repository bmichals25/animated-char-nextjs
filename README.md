# 3D Scene Viewer

This is a Next.js application with a 3D scene powered by React Three Fiber. It allows you to easily add and view 3D models in a web environment.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Adding 3D Models

To add your own 3D models to the scene:

1. Place your model files (GLB/GLTF format recommended) in the `public/models/` directory
2. Open `src/components/Scene3D.tsx` and uncomment the ModelLoader component
3. Update the `modelUrl` state with your model path:
   ```jsx
   const [modelUrl, setModelUrl] = useState<string>('/models/your-model.glb');
   ```
4. Customize position, rotation, and scale properties:
   ```jsx
   <ModelLoader 
     url={modelUrl} 
     position={[0, 0, 0]} 
     rotation={[0, 0, 0]} 
     scale={1} 
   />
   ```

## Features

- **Interactive 3D Viewport**: Orbit, pan, and zoom controls
- **Model Loading**: Easy loading of GLB/GLTF models
- **Lighting Setup**: Pre-configured lighting for proper 3D visualization
- **Responsive Design**: Works on desktop and mobile devices
- **Performance Monitoring**: Built-in stats for monitoring frame rates

## Customizing the Scene

You can customize the scene by editing the `src/components/Scene3D.tsx` file:

- Change the camera position and field of view
- Modify lighting configuration
- Add custom materials and geometries
- Implement animations and interactive elements

## Extending Functionality

To add more advanced features:

- Implement a UI for model selection
- Add model animation controls
- Create model positioning controls
- Implement custom shaders for special effects

## Alt Approach

This branch implements an alternative approach to the 3D scene viewer, exploring different techniques for model loading and rendering.

## Learn More

- [Three.js Documentation](https://threejs.org/docs/)
- [React Three Fiber Documentation](https://docs.pmnd.rs/react-three-fiber)
- [React Three Drei](https://github.com/pmndrs/drei)
- [Next.js Documentation](https://nextjs.org/docs)
