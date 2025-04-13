'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Plane, Text, MeshReflectorMaterial } from '@react-three/drei';
import { Suspense, useEffect, useState, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { AnimationUtils } from 'three';
import { Mesh, Group } from 'three';

// Correct path to the FBX model
const MODEL_PATH = '/models/facial-body-animated-party-m-0001-actorcore/source/model/Party_man_01.fbx';

// Texture paths
const TEXTURE_PATHS = {
  diffuse: '/models/facial-body-animated-party-m-0001-actorcore/textures/Character_Diffuse.jpeg',
  normal: '/models/facial-body-animated-party-m-0001-actorcore/textures/Character_Normal.jpeg',
  ao: '/models/facial-body-animated-party-m-0001-actorcore/textures/Character_ao.png',
  metallic: '/models/facial-body-animated-party-m-0001-actorcore/textures/Character_metallic.png',
  roughness: '/models/facial-body-animated-party-m-0001-actorcore/textures/Character_roughness.png'
};

// Define interface for facial expressions
interface Expression {
  [key: string]: number;
}

interface MorphTargetData {
  [key: string]: string[];
}

// Define some common facial expression presets (Original - Keep for reference)
const ORIGINAL_EXPRESSION_PRESETS: { [key: string]: { [key: string]: number } } = {
  'Neutral': {},
  'Happy': {
    'Mouth_Smile': 1.0,
    'Cheek_L': 0.5,
    'Cheek_R': 0.5,
    'Eye_Squeeze_L': 0.3,
    'Eye_Squeeze_R': 0.3,
    'Nose_Wrinkle': 0.1,
    'Eyebrow_Up_L': 0.4,
    'Eyebrow_Up_R': 0.4
  },
  'Sad': {
    'Mouth_Sad': 0.8,
    'Eyebrow_Sad_L': 0.7,
    'Eyebrow_Sad_R': 0.7,
    'Eye_Sad_L': 0.5,
    'Eye_Sad_R': 0.5,
    'Eye_Down_L': 0.3,
    'Eye_Down_R': 0.3,
    'Mouth_Down': 0.4
  },
  'Angry': {
    'Mouth_Angry': 0.8,
    'Eyebrow_Angry_L': 0.9,
    'Eyebrow_Angry_R': 0.9,
    'Eye_Squint_L': 0.6,
    'Eye_Squint_R': 0.6,
    'Nose_Scrunch': 0.7,
    'Mouth_Narrow': 0.5,
    'Jaw_Clench': 0.6
  },
  'Surprised': {
    'Mouth_Open': 0.8,
    'Eyebrow_Up_L': 1.0,
    'Eyebrow_Up_R': 1.0,
    'Eye_Wide_L': 0.9,
    'Eye_Wide_R': 0.9,
    'Jaw_Drop': 0.7,
    'Eye_Widen_L': 0.7,
    'Eye_Widen_R': 0.7
  },
  'Talk': {
    'Mouth_Open': 0.5,
    'Jaw_L': 0.2,
    'Jaw_R': 0.2,
    'Mouth_Lips_Part': 0.6,
    'Jaw_Forward': 0.2,
    'Jaw_Open': 0.6,
    'Mouth_Lips_Jaw_Adjust': 0.4
  },
  'Excited': {
    'Mouth_Open': 0.7,
    'Mouth_Smile': 1.0,
    'Eyebrow_Up_L': 0.8,
    'Eyebrow_Up_R': 0.8,
    'Eye_Wide_L': 0.6,
    'Eye_Wide_R': 0.6,
    'Jaw_Drop': 0.5
  },
  'Wink': {
    'Eye_Blink_L': 1.0,
    'Mouth_Smile': 0.3,
    'Cheek_L': 0.5
  },
  'Confused': {
    'Eyebrow_Up_L': 0.8,
    'Eyebrow_Down_R': 0.6,
    'Mouth_Pout': 0.4,
    'Eye_Squint_L': 0.3,
    'Head_Tilt': 0.5 // Note: Head_Tilt might involve bone rotation, not just morphs
  }
};

// Define NEW minimal facial expression presets for testing isolation
const EXPRESSION_PRESETS: { [key: string]: { [key: string]: number } } = {
  'Neutral': {}, // Reset to zero
  'Smile_Simple': {
    'Mouth_Smile': 0.8, // Only mouth smile
  },
  'Sad_Simple': {
    'Mouth_Sad': 0.7,   // Only mouth sad
    'Eyebrow_Sad_L': 0.6,
    'Eyebrow_Sad_R': 0.6
  },
   'Surprise_Simple': {
    'Mouth_Open': 0.7,
    'Eye_Wide_L': 0.8,
    'Eye_Wide_R': 0.8,
  },
  'Blink_L': {
    'Eye_Blink_L': 1.0, // Only left eye blink
  },
   'Blink_R': {
    'Eye_Blink_R': 1.0, // Only right eye blink
  },
};

// Define body pose presets (bone name -> [x, y, z] rotation in degrees)
const BODY_POSE_PRESETS: { [presetName: string]: { [boneName: string]: [number, number, number] } } = {
  'Reset': { // A pose to reset back to 0 rotations (Use this for neutral)
    'CC_Base_Head': [0, 0, 0],
    'CC_Base_L_Upperarm': [0, 0, 0],
    'CC_Base_R_Upperarm': [0, 0, 0],
    'CC_Base_Spine02': [0, 0, 0],
  },
  'Idle': {
    'CC_Base_Head': [0, -3, -2], // Slight tilt
    'CC_Base_L_Upperarm': [-5, 0, -10], // Arms slightly relaxed down/back
    'CC_Base_R_Upperarm': [-5, 0, -10],
    'CC_Base_Spine02': [0, 0, -1], // Slight lean
  },
  'Talking': {
    'CC_Base_Head': [0, 5, 0], // Slightly turned
    'CC_Base_L_Upperarm': [0, 0, 0], // Neutral arms
    'CC_Base_R_Upperarm': [0, 0, 0],
    'CC_Base_Spine02': [0, 3, 0], // Slight torso turn
  },
};

// Define the interface for the Model component ref
interface ModelRef {
  applyExpression: (preset: string) => void;
  setMorphTargetValue: (target: string, value: number) => void;
  setBoneRotation: (boneName: string, rotation: [number, number, number]) => void;
  applyBodyPose: (presetName: string) => void;
  playAnimation: (clipName: string) => void;
}

// Add interface for bone controls state
interface BoneControls {
  [key: string]: { rotation: [number, number, number] };
}

// Define interface for bone controls passed to ControlPanel
interface BoneControlProps {
  rotation: [number, number, number]; // [x, y, z] degrees
}

interface AllBoneControls {
  [boneName: string]: BoneControlProps;
}

const Model = forwardRef<ModelRef, { 
  onMorphTargetsLoaded: (targets: Expression) => void;
  onPresetClick?: (preset: string) => void;
  onAnimationsLoaded: () => void;
  animationsLoaded: boolean;
}>(({ onMorphTargetsLoaded, onPresetClick, onAnimationsLoaded, animationsLoaded }, ref) => {
  const { scene } = useThree();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const modelRef = useRef<THREE.Group>(null);
  const [morphMeshes, setMorphMeshes] = useState<THREE.Mesh[]>([]);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [morphTargets, setMorphTargets] = useState<Expression>({});
  const [showControls, setShowControls] = useState<boolean>(false);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);
  const [modelLoading, setModelLoading] = useState<boolean>(true);
  const animationRef = useRef<number | null>(null);
  const currentAnimations = useRef<Map<string, {
    startValue: number,
    targetValue: number,
    startTime: number,
    duration: number,
    mesh: THREE.Mesh,
    index: number
  }>>(new Map());
  
  // State to store references to controllable bones
  const controllableBones = useRef<Map<string, THREE.Bone>>(new Map());

  // Refs for animation
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const animationClips = useRef<Map<string, THREE.AnimationClip>>(new Map());
  const currentAction = useRef<THREE.AnimationAction | null>(null);

  // --- Blink Animation Refs --- 
  const blinkState = useRef({
    leftEyeIndex: -1,
    rightEyeIndex: -1,
    isBlinking: false,
    startTime: 0,
    nextBlinkTime: 0,
    durationClose: 0.075, // Faster close
    durationOpen: 0.125,  // Slightly slower open
    minDelay: 2000, // Min ms between blinks
    maxDelay: 6000  // Max ms between blinks
  });

  // Easing function for smoother animations
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Animation loop
  useFrame((state, delta) => {
    const now = state.clock.elapsedTime * 1000; // Get time in milliseconds

    // --- Update Blink Animation --- 
    const bs = blinkState.current;
    if (bs.leftEyeIndex !== -1 && bs.rightEyeIndex !== -1) { // Ensure indices are found
      // Time to start a new blink?
      if (!bs.isBlinking && now >= bs.nextBlinkTime) {
        bs.isBlinking = true;
        bs.startTime = now;
        // Calculate time for the *next* blink
        bs.nextBlinkTime = now + bs.minDelay + Math.random() * (bs.maxDelay - bs.minDelay);
        // console.log(`Starting blink at ${now}, next at ${bs.nextBlinkTime}`);
      }

      // Currently blinking?
      if (bs.isBlinking) {
        const elapsed = now - bs.startTime;
        let influence = 0;

        // Closing phase
        if (elapsed <= bs.durationClose * 1000) {
          const progress = elapsed / (bs.durationClose * 1000);
          influence = easeInOutCubic(progress); // Use existing easing
        } 
        // Opening phase
        else if (elapsed <= (bs.durationClose + bs.durationOpen) * 1000) {
          const openElapsed = elapsed - (bs.durationClose * 1000);
          const progress = openElapsed / (bs.durationOpen * 1000);
          influence = 1.0 - easeInOutCubic(progress); // Ease out from 1 to 0
        } 
        // Blink finished
        else {
          influence = 0;
          bs.isBlinking = false;
          // console.log('Blink finished');
        }

        // Apply influence directly to morph targets
        morphMeshes.forEach(mesh => {
          if (mesh.morphTargetInfluences) {
            if (bs.leftEyeIndex < mesh.morphTargetInfluences.length) {
              mesh.morphTargetInfluences[bs.leftEyeIndex] = influence;
            }
            if (bs.rightEyeIndex < mesh.morphTargetInfluences.length) {
              mesh.morphTargetInfluences[bs.rightEyeIndex] = influence;
            }
          }
        });
      }
    }
    // --------------------------

    // Update animation mixer
    mixer.current?.update(delta);

    if (currentAnimations.current.size > 0) {
      const keysToDelete: string[] = [];
      
      currentAnimations.current.forEach((anim, key) => {
        const elapsed = now - anim.startTime;
        const progress = Math.min(elapsed / anim.duration, 1);
        const easedProgress = easeInOutCubic(progress);
        
        // Calculate and apply the new value
        const newValue = anim.startValue + (anim.targetValue - anim.startValue) * easedProgress;
        anim.mesh.morphTargetInfluences![anim.index] = newValue;
        
        // If animation is complete, mark for deletion
        if (progress >= 1) {
          keysToDelete.push(key);
        }
      });
      
      // Remove completed animations
      keysToDelete.forEach(key => {
        currentAnimations.current.delete(key);
      });
    }
  });
  
  // Define the core animation playing logic
  const playAnimationLocal = (clipName: string) => {
    if (!mixer.current) {
      console.warn('[playAnimationLocal] Mixer not initialized');
      return;
    }
    const clip = animationClips.current.get(clipName);
    console.log('[playAnimationLocal] Available clips:', Array.from(animationClips.current.keys())); // Log available clips
    if (!clip) {
      console.warn(`[playAnimationLocal] Animation clip '${clipName}' not found.`);
      return;
    }
    console.log(`[Model] Playing animation: ${clipName}`);
    // Ensure looping for idle, non-looping for talk (adjust if needed)
    const loopMode = clipName === 'idle' ? THREE.LoopRepeat : THREE.LoopOnce;

    currentAction.current?.fadeOut(0.3); // Faster fade
    const action = mixer.current.clipAction(clip);
    action.setLoop(loopMode, Infinity); // Set loop mode
    if (loopMode === THREE.LoopOnce) {
      action.clampWhenFinished = true; // Hold last frame for non-looping anims
    }
    action.reset().fadeIn(0.3).play(); // Faster fade
    currentAction.current = action;
  };

  // Expose functions to parent component through ref
  useImperativeHandle(ref, () => ({
    applyExpression,
    setMorphTargetValue: (target: string, value: number) => {
      console.log(`[Model Ref] Setting morph target ${target} directly to ${value}`);
      morphMeshes.forEach(mesh => {
        if (mesh.morphTargetDictionary && target in mesh.morphTargetDictionary) {
          const index = mesh.morphTargetDictionary[target];
           if (mesh.morphTargetInfluences) {
            // Ensure the influence value is clamped between 0 and 1
            const clampedValue = Math.max(0, Math.min(1, value));
            mesh.morphTargetInfluences[index] = clampedValue; // Set influence directly
             console.log(` -> Set ${target} (index ${index}) to ${clampedValue} on mesh ${mesh.name}`);
           }
        } else {
            // Optional: Warn if the target isn't found on a mesh expected to have it
            if (mesh.morphTargetDictionary && morphMeshes.length > 0) { // Check if morphs are generally expected
               // console.warn(`[Model Ref] Morph target '${target}' not found in dictionary for mesh ${mesh.name}`);
            }
        }
      });
       // Update the internal morphTargets state used by the Model component itself
       // This helps keep the blink animation logic potentially consistent if needed
       setMorphTargets(prev => ({
         ...prev,
         [target]: value // Keep the UI state updated
       }));
    },
    setBoneRotation: (boneName: string, rotation: [number, number, number]) => {
      console.log(`[Model Ref] setBoneRotation called for ${boneName}`, rotation);
      const bone = controllableBones.current.get(boneName);
      if (bone && bone.rotation) {
        // Convert degrees to radians for THREE.js
        bone.rotation.set(
          THREE.MathUtils.degToRad(rotation[0]),
          THREE.MathUtils.degToRad(rotation[1]),
          THREE.MathUtils.degToRad(rotation[2])
        );
        console.log(`Rotated bone ${boneName} to`, rotation);
      } else {
        console.warn(`Bone ${boneName} not found in controllableBones ref.`);
      }
    },
    applyBodyPose: (presetName: string) => {
      console.log(`[Model Ref] Applying body pose preset: ${presetName}`);
      const preset = BODY_POSE_PRESETS[presetName];
      if (!preset) {
        console.warn(`Body pose preset '${presetName}' not found.`);
        return;
      }
      // Iterate over bones in the preset and call setBoneRotation
      Object.entries(preset).forEach(([boneName, rotation]) => {
        // Directly call the setBoneRotation logic defined above
        const bone = controllableBones.current.get(boneName);
        if (bone && bone.rotation) {
          bone.rotation.set(
            THREE.MathUtils.degToRad(rotation[0]),
            THREE.MathUtils.degToRad(rotation[1]),
            THREE.MathUtils.degToRad(rotation[2])
          );
          console.log(`Pose Set: Rotated bone ${boneName} to`, rotation);
        } else {
          console.warn(`Pose Set Warning: Bone ${boneName} not found in controllableBones ref.`);
        }
      });
    },
    playAnimation: playAnimationLocal
  }));

  useEffect(() => {
    const loader = new FBXLoader();
    const textureLoader = new THREE.TextureLoader();
    
    // Preload textures
    const textures = {
      diffuse: textureLoader.load(TEXTURE_PATHS.diffuse),
      normal: textureLoader.load(TEXTURE_PATHS.normal),
      ao: textureLoader.load(TEXTURE_PATHS.ao),
      metallic: textureLoader.load(TEXTURE_PATHS.metallic),
      roughness: textureLoader.load(TEXTURE_PATHS.roughness)
    };
    
    // Set texture parameters for better quality
    Object.values(textures).forEach(texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
    });
    
    loader.load(
      MODEL_PATH,
      (fbx) => {
        console.log('FBX model loaded successfully:', fbx);
        // Initialize Animation Mixer
        mixer.current = new THREE.AnimationMixer(fbx);

        setModel(fbx);
        setModelLoading(false);
        setModelLoaded(true);
        
        // Scale the model as needed
        fbx.scale.set(0.01, 0.01, 0.01);
        
        // Center the model
        const box = new THREE.Box3().setFromObject(fbx);
        const center = box.getCenter(new THREE.Vector3());
        fbx.position.x = -center.x;
        fbx.position.y = -center.y;
        fbx.position.z = -center.z;
        
        // Apply textures and configure materials
        fbx.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            console.log('Configuring materials for:', child.name);
            
            // Create or update material with textures
            if (child.material) {
              const isSkin = child.name.toLowerCase().includes('body') || 
                            child.name.toLowerCase().includes('skin') || 
                            child.name.toLowerCase().includes('head') ||
                            child.name.toLowerCase().includes('face');
              
              const isHair = child.name.toLowerCase().includes('hair');
              
              if (Array.isArray(child.material)) {
                child.material.forEach((mat, index) => {
                  console.log(`Material ${index} for ${child.name}:`, mat);
                  
                  // Create appropriate material based on part type
                  let newMat;
                  
                  if (isSkin) {
                    // Enhanced skin material
                    newMat = new THREE.MeshStandardMaterial({
                      map: textures.diffuse,
                      normalMap: textures.normal,
                      aoMap: textures.ao,
                      roughnessMap: textures.roughness,
                      metalnessMap: textures.metallic,
                      roughness: 0.7,           
                      metalness: 0.05,
                      envMapIntensity: 0.4,     // Subtle environment reflections
                      side: THREE.DoubleSide,
                      transparent: true,
                      opacity: 1.0,
                      color: new THREE.Color(0xffdbac)
                    });
                  } else if (isHair) {
                    // Enhanced hair material
                    newMat = new THREE.MeshStandardMaterial({
                      map: textures.diffuse,
                      normalMap: textures.normal,
                      aoMap: textures.ao,
                      roughnessMap: textures.roughness,
                      metalnessMap: textures.metallic,
                      roughness: 0.5,           
                      metalness: 0.3,           // More metallic for hair shine
                      envMapIntensity: 0.8,     // More environment reflections
                      side: THREE.DoubleSide,
                      transparent: true,
                      opacity: 1.0
                    });
                  } else {
                    // Default material for clothing
                    newMat = new THREE.MeshStandardMaterial({
                      map: textures.diffuse,
                      normalMap: textures.normal,
                      aoMap: textures.ao,
                      roughnessMap: textures.roughness,
                      metalnessMap: textures.metallic,
                      roughness: 0.8,
                      metalness: 0.1,
                      envMapIntensity: 0.6,
                      side: THREE.DoubleSide,
                      transparent: true,
                      opacity: 1.0
                    });
                  }
                  
                  // Copy properties from original material
                  if (mat.color) newMat.color.copy(mat.color);
                  
                  // Enable morphing on the new material
                  if (child.morphTargetInfluences && child.morphTargetInfluences.length > 0) {
                    (newMat as any).morphTargets = true;
                    (newMat as any).morphNormals = true;
                  }
                  
                  // Replace old material completely to avoid property conflicts
                  child.material[index] = newMat;
                });
              } else {
                console.log(`Single material for ${child.name}:`, child.material);
                
                // Create appropriate material based on part type
                let newMat;
                
                if (isSkin) {
                  // Enhanced skin material
                  newMat = new THREE.MeshStandardMaterial({
                    map: textures.diffuse,
                    normalMap: textures.normal,
                    aoMap: textures.ao,
                    roughnessMap: textures.roughness,
                    metalnessMap: textures.metallic,
                    roughness: 0.7,           
                    metalness: 0.05,
                    envMapIntensity: 0.4,     // Subtle environment reflections
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 1.0,
                    color: new THREE.Color(0xffdbac)
                  });
                } else if (isHair) {
                  // Enhanced hair material
                  newMat = new THREE.MeshStandardMaterial({
                    map: textures.diffuse,
                    normalMap: textures.normal,
                    aoMap: textures.ao,
                    roughnessMap: textures.roughness,
                    metalnessMap: textures.metallic,
                    roughness: 0.5,           
                    metalness: 0.3,           // More metallic for hair shine
                    envMapIntensity: 0.8,     // More environment reflections
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 1.0
                  });
                } else {
                  // Default material for clothing
                  newMat = new THREE.MeshStandardMaterial({
                    map: textures.diffuse,
                    normalMap: textures.normal,
                    aoMap: textures.ao,
                    roughnessMap: textures.roughness,
                    metalnessMap: textures.metallic,
                    roughness: 0.8,
                    metalness: 0.1,
                    envMapIntensity: 0.6,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 1.0
                  });
                }
                
                // Copy properties from original material
                if (child.material.color) newMat.color.copy(child.material.color);
                
                // Enable morphing on the new material
                if (child.morphTargetInfluences && child.morphTargetInfluences.length > 0) {
                  (newMat as any).morphTargets = true;
                  (newMat as any).morphNormals = true;
                }
                
                // Replace old material completely
                child.material = newMat;
              }
            }
          }
        });
        
        // Find all meshes with morph targets
        const meshesWithMorphs: THREE.Mesh[] = [];
        
        fbx.traverse((child) => {
          console.log('Child:', child.name, child.type);
          
          if (child instanceof THREE.Mesh) {
            console.log('Mesh found:', child.name);
            
            // Check if this mesh has morph targets
            if (child.morphTargetDictionary) {
              console.log('Morph target dictionary found for', child.name, ':', child.morphTargetDictionary);
              console.log('Morph target influences:', child.morphTargetInfluences);
              meshesWithMorphs.push(child);
            }
            
            // Also check the geometry for morph attributes
            if (child.geometry instanceof THREE.BufferGeometry) {
              console.log('Geometry attributes for', child.name, ':', Object.keys(child.geometry.attributes));
              if (child.geometry.morphAttributes) {
                console.log('Morph attributes found for', child.name, ':', Object.keys(child.geometry.morphAttributes));
                
                // If this mesh has morph attributes but no dictionary, add it anyway
                if (!child.morphTargetDictionary && Object.keys(child.geometry.morphAttributes).length > 0) {
                  meshesWithMorphs.push(child);
                }
              }
            }
          }
        });
        
        console.log('Meshes with morph targets:', meshesWithMorphs.length);
        setMorphMeshes(meshesWithMorphs);
        
        // If we found meshes with morph targets, extract their names and values
        if (meshesWithMorphs.length > 0) {
          // Get the first mesh with morph targets for now
          const mesh = meshesWithMorphs[0];
          
          if (mesh.morphTargetDictionary) {
            const targets: Expression = {};
            
            // Initialize all targets to 0
            Object.keys(mesh.morphTargetDictionary).forEach(key => {
              // Store blink indices if found
              if (key === 'Eye_Blink_L') blinkState.current.leftEyeIndex = mesh.morphTargetDictionary![key];
              if (key === 'Eye_Blink_R') blinkState.current.rightEyeIndex = mesh.morphTargetDictionary![key];
              targets[key] = 0;
            });
            
            setMorphTargets(targets);
            setShowControls(true);
            console.log('Available morph targets:', targets);
            
            // Send morph targets to parent component
            onMorphTargetsLoaded(targets);
          }
        }

        // Find and log bones
        const bones: THREE.Bone[] = [];
        fbx.traverse((child) => {
          if (child instanceof THREE.Bone) {
            bones.push(child);
          }
        });
        console.log('Found Bones:', bones.length);
        bones.forEach(bone => console.log(` - Bone Name: ${bone.name}`));

        // Store references to specific controllable bones
        const targetBoneNames = ['CC_Base_Head', 'CC_Base_L_Upperarm', 'CC_Base_R_Upperarm', 'CC_Base_Spine02'];
        bones.forEach(bone => {
          if (targetBoneNames.includes(bone.name)) {
            controllableBones.current.set(bone.name, bone);
            console.log(`Stored reference to bone: ${bone.name}`); // Add logging
            console.log(`controllableBones ref size after storage: ${controllableBones.current.size}`); // Log size
          }
        });
        // Log the final size *after* the loop completes
        console.log(`Final controllableBones ref size: ${controllableBones.current.size}`); 

        // --- Load Animations --- 
        const animLoader = new FBXLoader();
        const animationPaths = {
          idle: '/models/idle_251087.fbx',
          talk: '/models/stand-talk_251115.fbx'
        };

        let animationsToLoad = Object.keys(animationPaths).length;

        const checkAnimationsLoaded = () => {
          animationsToLoad--;
          if (animationsToLoad === 0) {
            console.log('All animation files processed.');
            onAnimationsLoaded();
          }
        };

        Object.entries(animationPaths).forEach(([name, path]) => {
          animLoader.load(
            path,
            (animFbx) => {
              console.log(`Loaded animation FBX: ${name} from ${path}`);
              const clip = animFbx.animations[0]; // Get the clip
              console.log(`Processing clip: ${clip.name} from ${path}`);
  
              // --- Remap Bone Names in Tracks --- 
              clip.tracks = clip.tracks.filter(track => {
                // Example track name: "Hip.position" or "L_Thigh.quaternion"
                const parts = track.name.split('.');
                let boneName = parts[0];
                const property = parts[1];
  
                // --- Skip Core Body Tracks (Root, Hip, Pelvis, Waist, Spine) --- 
                const coreBonesToSkip = ['BoneRoot', 'Hip', 'Pelvis', 'Waist', 'Spine01', 'Spine02'];
                // Add eye bones to the skip list
                const eyeBonesToSkip = ['L_Eye', 'R_Eye']; 
                // Add chest bones to the skip list
                const chestBonesToSkip = ['L_Breast', 'R_Breast', 'L_RibsTwist', 'R_RibsTwist'];
  
                if (coreBonesToSkip.includes(boneName) || 
                    eyeBonesToSkip.includes(boneName) || 
                    chestBonesToSkip.includes(boneName)) {
                    console.log(`Skipping track for bone: ${boneName}`);
                    return false; // Exclude this track
                }
                // -------------------------------
  
                // Simple prefixing logic (adjust if needed based on actual track names)
                let targetBoneName = boneName;
                if (boneName === 'BoneRoot') {
                  targetBoneName = 'RL_BoneRoot'; // Specific mapping for root
                } else if (!boneName.startsWith('CC_Base_') && boneName !== 'RL_BoneRoot') {
                   // Add prefix if it doesn't have it (and isn't the root)
                  targetBoneName = `CC_Base_${boneName}`;
                }
  
                if (boneName !== targetBoneName) {
                  console.log(`Remapping track: ${track.name} -> ${targetBoneName}.${property}`); // Keep logging active
                  track.name = `${targetBoneName}.${property}`;
                }
                return true; // Keep this track (if not skipped)
              });
              // ------------------------------------
  
              clip.name = name; // Rename clip itself to 'idle' or 'talk'
              animationClips.current.set(name, clip);
              console.log(`Stored MODIFIED animation clip: ${name}`);
              checkAnimationsLoaded();
  
            },
            undefined,
            (error) => {
              console.error(`Error loading animation ${name} from ${path}:`, error);
              checkAnimationsLoaded();
            }
          );
        });
      },
      (xhr) => {
        // console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`); // Less verbose loading log
      },
      (errorEvent) => {
        console.error('Error loading FBX:', errorEvent);
        // Handle error object which might be of type 'unknown'
        const errorMessage = errorEvent instanceof Error 
          ? errorEvent.message 
          : 'Unknown error occurred';
        setError('Failed to load model: ' + errorMessage);
        setModelLoading(false);
      }
    );
    
    return () => {
      // Cleanup animation frame
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  // Effect to auto-play idle animation once model and clips are loaded
  useEffect(() => {
    // Only run when model AND animations are loaded
    if (modelLoaded && animationClips.current.has('idle') && !currentAction.current) {
      console.log('[Effect] Auto-playing idle animation.');
      // Call the function directly, no need for ref here
      playAnimationLocal('idle');
    }
  }, [modelLoaded]);
  
  // Apply a preset expression
  const applyExpression = (presetName: string) => {
    if (morphMeshes.length === 0) return;
    
    console.log(`Applying expression preset: ${presetName}`);
    const preset = EXPRESSION_PRESETS[presetName] || {};
    console.log('Preset values:', preset);
    
    // --- MODIFICATION START ---
    // Clear any ongoing animations from the animation system (just in case)
    currentAnimations.current.clear();
    
    // Apply morph targets directly, bypassing the animation system
    morphMeshes.forEach(mesh => {
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        console.log(`Applying preset directly to ${mesh.name}`);

        // Set influences defined in the preset
        Object.entries(preset).forEach(([targetName, targetValue]) => {
          if (targetName in mesh.morphTargetDictionary!) {
            const index = mesh.morphTargetDictionary![targetName];
            mesh.morphTargetInfluences![index] = targetValue; // Set directly
             console.log(` -> Set ${targetName} (index ${index}) to ${targetValue}`);
          }
        });

        // Reset influences *not* defined in the preset to 0
        Object.keys(mesh.morphTargetDictionary).forEach(targetName => {
          if (!(targetName in preset)) {
            const index = mesh.morphTargetDictionary![targetName];
            // Only reset if it's not already 0 to avoid unnecessary assignments
            if (mesh.morphTargetInfluences![index] !== 0) {
               mesh.morphTargetInfluences![index] = 0; // Reset directly
               console.log(` -> Reset ${targetName} (index ${index}) to 0`);
            }
          }
        });
      }
    });
    // --- MODIFICATION END ---
    
    // Update the UI state (keep this part)
    const newTargets = { ...morphTargets };
    Object.keys(newTargets).forEach(key => {
      newTargets[key] = preset[key] || 0;
    });
    setMorphTargets(newTargets);
    
    // Notify parent component (keep this part)
    onMorphTargetsLoaded(newTargets);
  };
  
  // Handle preset click from parent
  useEffect(() => {
    // Expose the applyExpression function to the parent component
    if (onPresetClick) {
      onMorphTargetsLoaded({...morphTargets});
    }
  }, [onMorphTargetsLoaded, morphTargets]);
  
  // Render loading state if model is still loading
  if (modelLoading) {
    return (
      <Text
        position={[0, 0, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Loading model...
      </Text>
    );
  }
  
  // Render error state if there was an error
  if (error) {
    return (
      <Text
        position={[0, 0, 0]}
        fontSize={0.5}
        color="red"
        anchorX="center"
        anchorY="middle"
      >
        {error}
      </Text>
    );
  }
  
  // Render empty scene if model hasn't loaded yet
  if (!modelLoaded || !model) {
    return (
      <Text
        position={[0, 0, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        No model loaded
      </Text>
    );
  }
  
  return (
    <>
      <group ref={modelRef}>
        <primitive object={model} />
      </group>
      
      {/* Simplified Three-Point Lighting */}
      <ambientLight intensity={0.2} /> {/* Much lower ambient */}
      <directionalLight // Key Light
        position={[2, 3, 5]} // Angled from front-right-top
        intensity={1.2} 
        castShadow 
        shadow-mapSize-width={1024} 
        shadow-mapSize-height={1024}
      />
      <directionalLight // Fill Light
        position={[-3, 1, -4]} // From front-left-low
        intensity={0.4} 
      />
      <directionalLight // Rim Light
        position={[-1, 2, -5]} // From back-left-top
        intensity={0.6}
      />
      {/* <hemisphereLight args={['#ffffff', '#444444', 0.1]} /> Optional subtle ground/sky light */}
      
      {/* Add floor for better visual reference and reflections */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={50}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#050505"
          metalness={0.5}
        />
      </mesh>
    </>
  );
});

function ControlPanel({ 
  targets, 
  onChange, 
  onPresetClick, 
  boneControls, 
  onBoneRotationChange,
  onBodyPoseClick,
  onAnimationClick,
  animationsLoaded
}: { 
  targets: Expression; 
  onChange: (target: string, value: number) => void;
  onPresetClick: (preset: string) => void;
  boneControls: AllBoneControls;
  onBoneRotationChange: (boneName: string, axis: 'x' | 'y' | 'z', value: number) => void;
  onBodyPoseClick: (presetName: string) => void;
  onAnimationClick: (clipName: string) => void;
  animationsLoaded: boolean;
}) {
  // Default rotation range
  const rotationRange = { min: -180, max: 180, step: 1 };

  return (
    <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg max-h-[80vh] overflow-y-auto w-64">
      <h2 className="text-lg font-bold mb-2">Facial Controls</h2>
      
      {/* Animation Buttons */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold mb-1 text-black">Animations</h4>
        <div className="flex flex-wrap gap-2">
          {['idle', 'talk'].map(animName => (
            <button
              key={animName}
              onClick={() => { 
                console.log(`[ControlPanel Button] Clicked: ${animName}`);
                onAnimationClick(animName);
              }}
              disabled={!animationsLoaded}
              title={!animationsLoaded ? 'Loading animations...' : ''}
              className="px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 capitalize disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {animName}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-1">Presets</h3>
        <div className="flex flex-wrap gap-2">
          {Object.keys(EXPRESSION_PRESETS).map(preset => (
            <button
              key={preset}
              onClick={() => onPresetClick(preset)}
              className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
      
      <div className="text-gray-800">
        <h3 className="text-sm font-semibold mb-1 text-black">Morph Targets</h3>
        {Object.keys(targets).length === 0 ? (
          <p className="text-sm italic text-gray-500">No morph targets found</p>
        ) : (
          Object.entries(targets).map(([target, value]) => (
            <div key={target} className="mb-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium">{target}</label>
                <span className="text-xs font-medium">{value.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={value}
                onChange={(e) => onChange(target, parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          ))
        )}
      </div>

      {/* Body Controls Section */}
      <div className="mt-4 pt-4 border-t border-gray-300">
        {/* Body Pose Buttons */}
        <div className="mb-3">
          <h4 className="text-xs font-semibold mb-1 text-black">Body Poses</h4>
          <div className="flex flex-wrap gap-2">
            {Object.keys(BODY_POSE_PRESETS).map(preset => (
              <button
                key={preset}
                onClick={() => onBodyPoseClick(preset)}
                className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
        <h3 className="text-sm font-semibold mb-1 text-black">Body Controls</h3>
        {Object.keys(boneControls).length === 0 ? (
          <p className="text-sm italic text-gray-500">No bone controls available</p>
        ) : (
          Object.entries(boneControls).map(([boneName, control]) => (
            <div key={boneName} className="mb-3 p-2 border border-gray-200 rounded">
              <label className="text-xs font-medium block mb-1 text-gray-700">{boneName.replace('CC_Base_', '')}</label>
              <div className="flex flex-col space-y-1">
                {['x', 'y', 'z'].map((axis, index) => (
                  <div key={axis} className="flex items-center justify-between">
                    <label className="text-xs mr-1 uppercase font-medium text-gray-600">{axis}:</label>
                    <input
                      type="range"
                      min={rotationRange.min}
                      max={rotationRange.max}
                      step={rotationRange.step}
                      value={control.rotation[index]}
                      onChange={(e) => onBoneRotationChange(boneName, axis as 'x' | 'y' | 'z', parseFloat(e.target.value))}
                      className="w-2/3 mx-1"
                      title={`${axis.toUpperCase()}: ${control.rotation[index].toFixed(0)}°`}
                    />
                    <span className="text-xs w-8 text-right font-medium text-gray-700">{control.rotation[index].toFixed(0)}°</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CameraRig({ targetPosition, targetRotationDeg, controlsRef }: {
  targetPosition: [number, number, number];
  targetRotationDeg: [number, number, number];
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const initialSetupDone = useRef(false);
  const animationFrameId = useRef<number | null>(null);

  // Force camera position immediately on mount and when props change
  useEffect(() => {
    console.log('[CameraRig] Initial setup starting with position:', targetPosition, 'rotation:', targetRotationDeg);
    
    if (camera) {
      // Set position immediately
      camera.position.set(targetPosition[0], targetPosition[1], targetPosition[2]);
      
      // Set rotation immediately
      const rotX = THREE.MathUtils.degToRad(targetRotationDeg[0]);
      const rotY = THREE.MathUtils.degToRad(targetRotationDeg[1]);
      const rotZ = THREE.MathUtils.degToRad(targetRotationDeg[2]);
      const quaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rotX, rotY, rotZ, 'XYZ')
      );
      camera.quaternion.copy(quaternion);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      
      console.log('[CameraRig] Immediate camera position set to:', camera.position.toArray());
      console.log('[CameraRig] Immediate camera quaternion set to:', camera.quaternion.toArray());
    }
  }, [camera, targetPosition, targetRotationDeg]);

  useEffect(() => {
    const trySetup = () => {
      if (initialSetupDone.current) return;

      const currentControls = controlsRef.current;

      console.log('[CameraRig trySetup Ref] Attempting setup. Camera:', camera ? 'Exists' : 'null', 'Controls Ref:', currentControls ? 'Exists' : 'null');

      // Check if camera AND controls REF are ready NOW (and have target prop)
      if (currentControls && camera && currentControls.target) {
          console.log('[CameraRig trySetup Ref] Applying DEFAULT initial camera state via REF...');

          // --- Log current state BEFORE setting ---
          console.log('   BEFORE Setting - Camera Pos:', camera.position.toArray());
          console.log('   BEFORE Setting - Camera Quat:', camera.quaternion.toArray());
          // ---------------------------------------------

          // --- Perform Setup Logic using Ref ---
          camera.position.set(...targetPosition);
          const rotX = THREE.MathUtils.degToRad(targetRotationDeg[0]);
          const rotY = THREE.MathUtils.degToRad(targetRotationDeg[1]);
          const rotZ = THREE.MathUtils.degToRad(targetRotationDeg[2]);
          const quaternion = new THREE.Quaternion().setFromEuler(
              new THREE.Euler(rotX, rotY, rotZ, 'XYZ')
          );
          camera.quaternion.copy(quaternion);
          camera.updateProjectionMatrix();
          camera.updateMatrixWorld(true);

          // Use controlsRef.current directly
          currentControls.target.set(0, 1.0, 0);
          currentControls.enabled = false; // Disable controls
          currentControls.update();
          // --- End Setup Logic ---

          initialSetupDone.current = true;

          console.log('[CameraRig trySetup Ref] DEFAULT Initial camera setup complete via REF. Controls DISABLED.');
          console.log('   Default Position set to:', targetPosition);
          console.log('   Default Rotation set to (deg):', targetRotationDeg);

      } else {
           console.log('[CameraRig trySetup Ref] Waiting for camera/controls REF... scheduling retry.');
           // Only schedule retry if setup is not done
           if (!initialSetupDone.current) { 
                animationFrameId.current = requestAnimationFrame(trySetup);
           }
      }
    }; // End of trySetup

    trySetup(); // Start polling

    // Cleanup
    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [camera, controlsRef, targetPosition, targetRotationDeg]);

  return null;
}

export default function Scene3D() {
  const modelRef = useRef<ModelRef>(null);
  const orbitControlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
  // Use refs for the default camera values so they can be updated
  const defaultTargetPosition = useRef<[number, number, number]>([-0.18, 1.73, 1.2]);
  const defaultTargetRotationDeg = useRef<[number, number, number]>([-11.36, -22.22, -4.35]);
  const initialSetupComplete = useRef<boolean>(false);

  const [morphTargets, setMorphTargets] = useState<Expression>({});
  const [showControls, setShowControls] = useState<boolean>(true);
  const [animationsLoaded, setAnimationsLoaded] = useState<boolean>(false);
  const [cameraInfo, setCameraInfo] = useState<{position: [number, number, number], rotation: [number, number, number]}>({
    position: [-0.18, 1.73, 1.2],
    rotation: [-11.36, -22.22, -4.35]
  });
  const [showCameraInfo, setShowCameraInfo] = useState<boolean>(false);
  const [showCameraWindow, setShowCameraWindow] = useState<boolean>(false); // Hidden by default
  const [showFacialControls, setShowFacialControls] = useState<boolean>(false); // Hidden by default
  const [showKeyHints, setShowKeyHints] = useState<boolean>(false); // Hide key hints by default
  const [boneControls, setBoneControls] = useState<AllBoneControls>({ 
    'CC_Base_Head': { rotation: [0, 0, 0] },
    'CC_Base_L_Upperarm': { rotation: [0, 0, 0] },
    'CC_Base_R_Upperarm': { rotation: [0, 0, 0] },
    'CC_Base_Spine02': { rotation: [0, 0, 0] },
  });

  const [manualCamPos, setManualCamPos] = useState<[string, string, string]>(["-0.18", "1.73", "1.2"]);
  const [manualCamRot, setManualCamRot] = useState<[string, string, string]>(["-11.36", "-22.22", "-4.35"]);

  console.log(`[Scene3D Render]`);

  const logCameraPosition = useCallback(() => {
    if (cameraRef.current) {
      const camera = cameraRef.current;
      const precision = 5;

      // Save the existing values first
      const existingPos = camera.position.clone();
      const existingQuat = camera.quaternion.clone();

      const pos: [number, number, number] = [
        parseFloat(camera.position.x.toFixed(precision)),
        parseFloat(camera.position.y.toFixed(precision)),
        parseFloat(camera.position.z.toFixed(precision))
       ];
      const euler = new THREE.Euler(0, 0, 0, 'XYZ').setFromQuaternion(camera.quaternion);
      const rot: [number, number, number] = [
        parseFloat(THREE.MathUtils.radToDeg(euler.x).toFixed(precision)),
        parseFloat(THREE.MathUtils.radToDeg(euler.y).toFixed(precision)),
        parseFloat(THREE.MathUtils.radToDeg(euler.z).toFixed(precision))
       ];
      console.log('Actual Camera Pos:', pos, 'Rot:', rot);
      
      // Store the logged position as our default target positions
      // This ensures consistency between logging and camera control
      defaultTargetPosition.current = [...pos];
      defaultTargetRotationDeg.current = [...rot];
      
      setCameraInfo({ position: pos, rotation: rot });
      setShowCameraInfo(true);
      
      // Ensure the camera position doesn't get altered by logging
      // by explicitly enforcing the position we just logged
      camera.position.copy(existingPos);
      camera.quaternion.copy(existingQuat);
    } else {
       console.warn("cameraRef not available for logging");
    }
  }, []);
  
  const lockCamera = useCallback(() => {
    if (orbitControlsRef.current) {
        orbitControlsRef.current.enabled = false;
        console.log('Camera locked via button.');
    } else { console.warn("orbitControlsRef not available for lock"); }
  }, []);
  
  const unlockCamera = useCallback(() => {
    if (orbitControlsRef.current) {
        orbitControlsRef.current.enabled = true;
        orbitControlsRef.current.enableRotate = true; // Only enable rotation
        orbitControlsRef.current.enableZoom = true; // Optional: allow zooming
        orbitControlsRef.current.enablePan = false; // Keep panning disabled
        orbitControlsRef.current.autoRotate = false; // Ensure no auto-rotation
        console.log('Camera partially unlocked via button - rotation and zoom only.');
    } else { console.warn("orbitControlsRef not available for unlock"); }
  }, []);
  
  const handleMorphTargetChange = (target: string, value: number) => { 
    console.log(`[Scene3D] Slider change: ${target} to ${value}`);
    setMorphTargets(prev => ({ ...prev, [target]: value }));
    if (modelRef.current) { modelRef.current.setMorphTargetValue(target, value); }
    else { console.warn('[Scene3D] Model ref not available for morph target change.'); }
  };
  
  const handlePresetClick = (preset: string) => { 
    console.log(`Scene3D: Applying preset: ${preset}`);
    if (modelRef.current) {
      console.log(`Scene3D: Resetting body pose before applying expression.`);
      modelRef.current.applyBodyPose('Reset');
      modelRef.current.applyExpression(preset);
    } else { console.warn('Model ref not available for preset click.'); }
  };
  
  const handleBodyPoseClick = (presetName: string) => { 
    console.log(`Scene3D: Applying body pose preset: ${presetName}`);
    if (modelRef.current) {
      modelRef.current.applyBodyPose(presetName);
      const preset = BODY_POSE_PRESETS[presetName];
      if (preset) {
        setBoneControls(prev => {
          const newState = { ...prev };
          Object.entries(preset).forEach(([boneName, rotation]) => {
            if (newState[boneName]) { newState[boneName] = { rotation }; }
          });
          return newState;
        });
      }
    } else { console.warn('Model ref not available for body pose.'); }
  };
  
  const handleBoneRotationChange = (boneName: string, axis: 'x' | 'y' | 'z', value: number) => { 
    console.log(`[Scene3D] handleBoneRotationChange: ${boneName}, axis ${axis}, value ${value}`);
    const newRotation = [...boneControls[boneName].rotation] as [number, number, number];
    const axisIndex = { x: 0, y: 1, z: 2 }[axis];
    newRotation[axisIndex] = value;
    setBoneControls(prev => ({ ...prev, [boneName]: { rotation: newRotation }, }));
    if (modelRef.current) { modelRef.current.setBoneRotation(boneName, newRotation); }
    else { console.warn('Model ref not available for bone rotation change.'); }
  };
  
  const handleAnimationClick = (clipName: string) => { 
    console.log(`Scene3D: Playing animation: ${clipName}`);
    if (modelRef.current) {
      console.log(`[Scene3D] Calling modelRef.current.playAnimation('${clipName}')`);
      modelRef.current.playAnimation(clipName);
    } else { console.warn('Model ref not available for animation.'); }
  };

  const handleApplyManualCamera = useCallback(() => {
    if (cameraRef.current && orbitControlsRef.current) {
      const camera = cameraRef.current;
      const controls = orbitControlsRef.current;

      try {
        const pos = manualCamPos.map(Number) as [number, number, number];
        const rotDeg = manualCamRot.map(Number) as [number, number, number];

        if (pos.some(isNaN) || rotDeg.some(isNaN)) {
            alert('Invalid number format in camera inputs.');
            return;
        }

        console.log('[Manual Apply] Setting camera state...');
        console.log('   Target Pos:', pos);
        console.log('   Target Rot (deg):', rotDeg);

        // Fully disable controls
        controls.enabled = false;
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.enableRotate = false;
        controls.autoRotate = false;
        
        console.log('[Manual Apply] Controls fully disabled before applying state.');

        // Set position and rotation
        camera.position.set(...pos);
        const rotX = THREE.MathUtils.degToRad(rotDeg[0]);
        const rotY = THREE.MathUtils.degToRad(rotDeg[1]);
        const rotZ = THREE.MathUtils.degToRad(rotDeg[2]);
        const quaternion = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(rotX, rotY, rotZ, 'XYZ')
        );
        camera.quaternion.copy(quaternion);

        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);

        // Fixed target position
        controls.target.set(0, 1.0, 0);
        controls.update();
        
        // Store these values as the new defaults
        // This helps prevent other effects from overriding our manual camera position
        defaultTargetPosition.current = [...pos];
        defaultTargetRotationDeg.current = [...rotDeg];
        console.log('[Manual Apply] Camera state applied and default targets updated to:', 
          defaultTargetPosition.current, defaultTargetRotationDeg.current);

        // Update the displayed camera info to match what we just set
        setCameraInfo({
          position: pos,
          rotation: rotDeg
        });
        setShowCameraInfo(true);

      } catch (error) {
        console.error('Error applying manual camera transform:', error);
        alert('Failed to apply camera transform. Check console.');
      }
    } else {
      console.warn('[Manual Apply] Camera or controls ref not ready.');
      alert('Camera or controls not ready yet.');
    }
  }, [manualCamPos, manualCamRot]);

  const handleUseCurrentForManual = useCallback(() => {
    if (cameraInfo.position && cameraInfo.rotation) {
      const posStrings = cameraInfo.position.map(String) as [string, string, string];
      const rotStrings = cameraInfo.rotation.map(String) as [string, string, string];
      setManualCamPos(posStrings);
      setManualCamRot(rotStrings);
      console.log('Manual input fields updated with current logged values.');
      alert('Manual input fields updated with current logged values.');
    } else {
      alert('No current camera values logged yet. Click "Log Current Values" first.');
    }
  }, [cameraInfo]);

  // Reset camera position on first render and force it into place
  useEffect(() => {
    // Only run once on first mount
    if (!initialSetupComplete.current) {
      console.log('[Scene3D] CRITICAL initial camera position setup');
      
      // Immediate setup
      if (cameraRef.current) {
        const camera = cameraRef.current;
        const pos = [-0.18, 1.73, 1.2] as [number, number, number]; // Hard-coded position
        const rotDeg = [-11.36, -22.22, -4.35] as [number, number, number]; // Hard-coded rotation
        
        // Apply position
        camera.position.set(...pos);
        
        // Apply rotation
        const rotX = THREE.MathUtils.degToRad(rotDeg[0]);
        const rotY = THREE.MathUtils.degToRad(rotDeg[1]);
        const rotZ = THREE.MathUtils.degToRad(rotDeg[2]);
        const quaternion = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(rotX, rotY, rotZ, 'XYZ')
        );
        camera.quaternion.copy(quaternion);
        
        // Update matrices
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
        
        console.log('[Scene3D] CRITICAL camera setup complete:', 
          'Position:', camera.position.toArray(),
          'Rotation:', rotDeg);
      }
      
      // Multiple attempts with increasing delays to overcome any race conditions
      const attempts = [0, 100, 300, 500, 1000]; // milliseconds
      
      attempts.forEach(delay => {
        setTimeout(() => {
          if (cameraRef.current) {
            const camera = cameraRef.current;
            camera.position.set(-0.18, 1.73, 1.2);
            
            const rotX = THREE.MathUtils.degToRad(-11.36);
            const rotY = THREE.MathUtils.degToRad(-22.22);
            const rotZ = THREE.MathUtils.degToRad(-4.35);
            camera.quaternion.setFromEuler(new THREE.Euler(rotX, rotY, rotZ, 'XYZ'));
            
            camera.updateProjectionMatrix();
            camera.updateMatrixWorld(true);
            
            // If we have orbit controls, forcibly disable them and set the target
            if (orbitControlsRef.current) {
              const controls = orbitControlsRef.current;
              controls.enabled = false;
              controls.enableZoom = false;
              controls.enablePan = false;
              controls.enableRotate = false;
              controls.target.set(0, 1.0, 0);
              controls.update();
            }
            
            console.log(`[Scene3D] Attempt at ${delay}ms: Position set to:`, camera.position.toArray());
          }
        }, delay);
      });
      
      initialSetupComplete.current = true;
    }
  }, []);

  // Add keyboard event listeners for F8 and F9
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F8 toggles camera window
      if (e.key === 'F8') {
        e.preventDefault(); // Prevent default browser action
        setShowCameraWindow(prev => !prev);
        console.log('[Scene3D] Camera window toggled:', !showCameraWindow);
      }
      
      // F9 toggles facial controls
      if (e.key === 'F9') {
        e.preventDefault(); // Prevent default browser action
        setShowFacialControls(prev => !prev);
        console.log('[Scene3D] Facial controls toggled:', !showFacialControls);
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCameraWindow, showFacialControls]);

  // Add event listeners for fn key to show/hide key hints
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Use Alt key (Option on Mac) as it's more reliably detectable across platforms
      if (e.altKey) {
        setShowKeyHints(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // When Alt key is released, hide hints
      if (!e.altKey) {
        setShowKeyHints(false);
      }
    };
    
    // Also handle document visibility to ensure hints don't stay visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setShowKeyHints(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="relative w-full h-screen">
      <Canvas 
        shadows 
        camera={{ 
          position: [-0.18, 1.73, 1.2], 
          rotation: [THREE.MathUtils.degToRad(-11.36), THREE.MathUtils.degToRad(-22.22), THREE.MathUtils.degToRad(-4.35)],
          fov: 50
        }}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera
            makeDefault
            fov={50}
            ref={cameraRef}
            position={[-0.18, 1.73, 1.2]} 
            rotation={[THREE.MathUtils.degToRad(-11.36), THREE.MathUtils.degToRad(-22.22), THREE.MathUtils.degToRad(-4.35)]}
          />

          <CameraRig
            targetPosition={[-0.18, 1.73, 1.2]}
            targetRotationDeg={[-11.36, -22.22, -4.35]}
            controlsRef={orbitControlsRef}
          />

          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
          <Model
            ref={modelRef}
            onMorphTargetsLoaded={(targets) => { setMorphTargets(targets); setShowControls(true); }}
            onAnimationsLoaded={() => { setAnimationsLoaded(true); }}
            animationsLoaded={animationsLoaded}
          />

          <OrbitControls
            ref={orbitControlsRef}
            enableDamping={true}
            dampingFactor={0.25}
            enabled={false} // Start with controls disabled
            enableZoom={false}
            enablePan={false}
            enableRotate={false}
            autoRotate={false}
          />

          <Environment preset="sunset" />
        </Suspense>
      </Canvas>

      {showCameraWindow && (
        <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-lg w-64 z-10">
          <h3 className="text-sm font-semibold mb-2 text-black">Current Camera</h3>
          <button onClick={logCameraPosition} className="w-full px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 mb-2">Log Current Values</button>
          <div className="flex space-x-2 mb-2">
            <button onClick={lockCamera} className="flex-1 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">Lock Controls</button>
            <button onClick={unlockCamera} className="flex-1 px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">Unlock Controls</button>
          </div>
          {showCameraInfo && ( 
              <div className="mt-2 text-xs space-y-1">
                  <p className="font-semibold">Position:</p>
                  <p>X: {cameraInfo.position[0]}, Y: {cameraInfo.position[1]}, Z: {cameraInfo.position[2]}</p>
                  <p className="font-semibold mt-1">Rotation (deg):</p>
                  <p>X: {cameraInfo.rotation[0]}, Y: {cameraInfo.rotation[1]}, Z: {cameraInfo.rotation[2]}</p>
                  <button onClick={handleUseCurrentForManual} className="mt-2 w-full px-2 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600" title="Copies the logged values above into the manual input fields below">Use These Values for Manual Set</button>
                  <button onClick={() => { 
                      console.log('Copy to clipboard:', JSON.stringify(cameraInfo, null, 2));
                      navigator.clipboard.writeText(JSON.stringify(cameraInfo, null, 2))
                      .then(() => alert('Camera info copied to clipboard!'))
                      .catch(err => console.error('Could not copy text: ', err));
                   }} className="mt-1 w-full px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600">Copy Current JSON</button>
              </div>
          )}
          <div className="mt-4 pt-3 border-t border-gray-300">
            <h3 className="text-sm font-semibold mb-2 text-black">Manual Camera Set</h3>
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div>
                    <label className="block font-medium mb-1">Pos X:</label>
                    <input type="number" step="0.01" value={manualCamPos[0]} onChange={e => setManualCamPos([e.target.value, manualCamPos[1], manualCamPos[2]])} className="w-full p-1 border rounded" />
                </div>
                <div>
                    <label className="block font-medium mb-1">Rot X:</label>
                    <input type="number" step="0.01" value={manualCamRot[0]} onChange={e => setManualCamRot(prev => [e.target.value, prev[1], prev[2]])} className="w-full p-1 border rounded" />
                </div>
                 <div>
                    <label className="block font-medium mb-1">Pos Y:</label>
                    <input type="number" step="0.01" value={manualCamPos[1]} onChange={e => setManualCamPos([manualCamPos[0], e.target.value, manualCamPos[2]])} className="w-full p-1 border rounded" />
                </div>
                 <div>
                    <label className="block font-medium mb-1">Rot Y:</label>
                    <input type="number" step="0.01" value={manualCamRot[1]} onChange={e => setManualCamRot(prev => [prev[0], e.target.value, prev[2]])} className="w-full p-1 border rounded" />
                </div>
                 <div>
                    <label className="block font-medium mb-1">Pos Z:</label>
                    <input type="number" step="0.01" value={manualCamPos[2]} onChange={e => setManualCamPos([manualCamPos[0], manualCamPos[1], e.target.value])} className="w-full p-1 border rounded" />
                </div>
                 <div>
                    <label className="block font-medium mb-1">Rot Z:</label>
                    <input type="number" step="0.01" value={manualCamRot[2]} onChange={e => setManualCamRot(prev => [prev[0], prev[1], e.target.value])} className="w-full p-1 border rounded" />
                </div>
            </div>
            <button onClick={handleApplyManualCamera} className="w-full px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded hover:bg-orange-600">Apply Manual Transform</button>
          </div>
        </div>
      )}

      {showControls && showFacialControls && ( 
        <ControlPanel 
          targets={morphTargets}
          onChange={handleMorphTargetChange}
          onPresetClick={handlePresetClick}
          boneControls={boneControls}
          onBoneRotationChange={handleBoneRotationChange}
          onBodyPoseClick={handleBodyPoseClick}
          onAnimationClick={handleAnimationClick}
          animationsLoaded={animationsLoaded}
        /> 
      )}
      
      {/* Keyboard shortcut info - only visible when Alt key is pressed */}
      {showKeyHints && (
        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs p-2 rounded">
          Hold Alt for hints | F8: Toggle Camera Window | F9: Toggle Facial Controls
        </div>
      )}
    </div>
  );
} 