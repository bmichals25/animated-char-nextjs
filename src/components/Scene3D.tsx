'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Plane, Text, MeshReflectorMaterial } from '@react-three/drei';
import { Suspense, useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
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

// Define some common facial expression presets
const EXPRESSION_PRESETS: { [key: string]: { [key: string]: number } } = {
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
    'Head_Tilt': 0.5
  }
};

// Define body pose presets (bone name -> [x, y, z] rotation in degrees)
const BODY_POSE_PRESETS: { [presetName: string]: { [boneName: string]: [number, number, number] } } = {
  'Reset': { // A pose to reset back to 0 rotations
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
      setSelectedTarget(target);
      setCurrentValue(value);
    },
    // Add function to set bone rotation
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
    // Add function to apply a body pose preset
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
    // Add function to play an animation
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
  
  // Update morph target values when they change
  useEffect(() => {
    if (morphMeshes.length === 0 || !selectedTarget) return;
    
    // Start animating to the new value
    morphMeshes.forEach(mesh => {
      if (mesh.morphTargetDictionary && selectedTarget in mesh.morphTargetDictionary) {
        const index = mesh.morphTargetDictionary[selectedTarget];
        const startValue = mesh.morphTargetInfluences![index];
        
        // Create animation
        const animKey = `${mesh.uuid}_${selectedTarget}`;
        currentAnimations.current.set(animKey, {
          mesh,
          index,
          startValue,
          targetValue: currentValue,
          startTime: Date.now(),
          duration: 300
        });
      }
    });
  }, [morphMeshes, selectedTarget, currentValue]);
  
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
    
    // Clear all current animations
    currentAnimations.current.clear();
    
    // For each mesh with morph targets
    morphMeshes.forEach(mesh => {
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        console.log(`Applying preset to ${mesh.name}`);
        
        // Create animations for each target in the preset
        Object.entries(preset).forEach(([targetName, targetValue]) => {
          if (targetName in mesh.morphTargetDictionary!) {
            const index = mesh.morphTargetDictionary![targetName];
            const startValue = mesh.morphTargetInfluences![index];
            
            // Add animation
            const animKey = `${mesh.uuid}_${targetName}`;
            currentAnimations.current.set(animKey, {
              mesh,
              index,
              startValue,
              targetValue,
              startTime: Date.now(),
              duration: 500 // Slightly longer animation for expressions
            });
          }
        });
        
        // Reset any morph targets not in the preset
        Object.keys(mesh.morphTargetDictionary).forEach(targetName => {
          if (!(targetName in preset)) {
            const index = mesh.morphTargetDictionary![targetName];
            const startValue = mesh.morphTargetInfluences![index];
            
            // Only animate if the current value is not already 0
            if (startValue !== 0) {
              const animKey = `${mesh.uuid}_${targetName}`;
              currentAnimations.current.set(animKey, {
                mesh,
                index,
                startValue,
                targetValue: 0,
                startTime: Date.now(),
                duration: 400
              });
            }
          }
        });
      }
    });
    
    // Update the UI state
    const newTargets = { ...morphTargets };
    Object.keys(newTargets).forEach(key => {
      newTargets[key] = preset[key] || 0;
    });
    setMorphTargets(newTargets);
    
    // Notify parent component
    onMorphTargetsLoaded(newTargets);
  };
  
  // Handle morph target slider change
  const handleSliderChange = (target: string, value: number) => {
    setSelectedTarget(target);
    setCurrentValue(value);
    
    console.log(`Setting morph target ${target} to ${value}`);
    
    // Apply the change to the actual 3D meshes with animation
    morphMeshes.forEach(mesh => {
      if (mesh.morphTargetDictionary && target in mesh.morphTargetDictionary) {
        const index = mesh.morphTargetDictionary[target];
        console.log(`Setting ${target} (index ${index}) to ${value} on mesh ${mesh.name}`);
        
        if (mesh.morphTargetInfluences) {
          // Create an animation for this change
          const animKey = `${mesh.uuid}_${target}`;
          const startValue = mesh.morphTargetInfluences[index];
          
          currentAnimations.current.set(animKey, {
            mesh,
            index,
            startValue,
            targetValue: value,
            startTime: Date.now(),
            duration: 200 // Faster for direct slider manipulation
          });
        }
      }
    });
    
    // Update the morphTargets state
    setMorphTargets(prev => ({
      ...prev,
      [target]: value
    }));
  };
  
  // Handle preset click from parent
  useEffect(() => {
    // Expose the applyExpression function to the parent component
    if (onPresetClick) {
      onMorphTargetsLoaded({...morphTargets});
    }
  }, [onMorphTargetsLoaded, morphTargets]);
  
  // Add a toggle color sphere for debugging
  const [sphereColor, setSphereColor] = useState('red');
  const toggleSphereColor = () => {
    setSphereColor(prev => prev === 'red' ? 'blue' : 'red');
  };
  
  // Animate the model if needed
  useFrame((state, delta) => {
    if (modelRef.current) {
      // You can add animations here
    }
  });
  
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
        
        {/* Debug sphere */}
        <mesh position={[1, 1, 1]} onClick={toggleSphereColor}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={sphereColor} />
        </mesh>
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

export default function Scene3D() {
  const [morphTargets, setMorphTargets] = useState<Expression>({});
  const [showControls, setShowControls] = useState<boolean>(true);
  const [animationsLoaded, setAnimationsLoaded] = useState<boolean>(false);
  console.log(`[Scene3D Render] animationsLoaded state: ${animationsLoaded}`); // Log state on render
  const modelRef = useRef<ModelRef>(null);
  
  // State for bone controls
  const [boneControls, setBoneControls] = useState<AllBoneControls>({
    // Initialize with default rotations (0, 0, 0) for the bones we control
    'CC_Base_Head': { rotation: [0, 0, 0] },
    'CC_Base_L_Upperarm': { rotation: [0, 0, 0] },
    'CC_Base_R_Upperarm': { rotation: [0, 0, 0] },
    'CC_Base_Spine02': { rotation: [0, 0, 0] },
  });
  
  const handleMorphTargetChange = (target: string, value: number) => {
    console.log(`Scene3D: Setting ${target} to ${value}`);
    // Update the state (this might still be useful for the UI)
    setMorphTargets(prev => ({
      ...prev,
      [target]: value
    }));
    
    // If we have a model ref, apply the change to the model directly
    if (modelRef.current) {
      modelRef.current.setMorphTargetValue(target, value);
    }
  };
  
  const handlePresetClick = (preset: string) => {
    console.log(`Scene3D: Applying preset: ${preset}`);
    if (modelRef.current) {
      modelRef.current.applyExpression(preset);
    } else {
      console.warn('Model ref not available');
    }
  };

  // Handler for body pose click
  const handleBodyPoseClick = (presetName: string) => {
    console.log(`Scene3D: Applying body pose preset: ${presetName}`);
    if (modelRef.current) {
      modelRef.current.applyBodyPose(presetName);
      // Optionally update the UI state to reflect the preset
      const preset = BODY_POSE_PRESETS[presetName];
      if (preset) {
        setBoneControls(prev => {
          const newState = { ...prev };
          Object.entries(preset).forEach(([boneName, rotation]) => {
            if (newState[boneName]) {
              newState[boneName] = { rotation };
            }
          });
          return newState;
        });
      }
    } else {
      console.warn('Model ref not available for body pose.');
    }
  };

  // Handler for bone rotation changes
  const handleBoneRotationChange = (boneName: string, axis: 'x' | 'y' | 'z', value: number) => {
    console.log(`[Scene3D] handleBoneRotationChange called for ${boneName}, axis ${axis}, value ${value}`); // Log handler call
    const newRotation = [...boneControls[boneName].rotation] as [number, number, number];
    const axisIndex = { x: 0, y: 1, z: 2 }[axis];
    newRotation[axisIndex] = value;

    // Update state for the UI
    console.log(`[Scene3D] New rotation calculated: ${JSON.stringify(newRotation)} for ${boneName}`); // Log the calculated rotation
    setBoneControls(prev => ({
      ...prev,
      [boneName]: { rotation: newRotation },
    }));

    // Apply rotation to the model via ref
    if (modelRef.current) {
      modelRef.current.setBoneRotation(boneName, newRotation);
    }
  };

  // Handler for animation button click
  const handleAnimationClick = (clipName: string) => {
    console.log(`Scene3D: Playing animation: ${clipName}`);
    if (modelRef.current) {
      // Add log before playing
      console.log(`[Scene3D] Calling modelRef.current.playAnimation('${clipName}')`);
      modelRef.current.playAnimation(clipName);
    } else {
      console.warn('Model ref not available for animation.');
    }
  };

  return (
    <div className="relative w-full h-full">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 1, 5]} />
        <OrbitControls />
        <Suspense fallback={null}>
          <Model 
            onMorphTargetsLoaded={setMorphTargets}
            onPresetClick={handlePresetClick}
            onAnimationsLoaded={() => { 
              console.log('[Scene3D] onAnimationsLoaded callback triggered!'); // Log callback
              setAnimationsLoaded(true); 
            }}
            animationsLoaded={animationsLoaded}
            ref={modelRef}
          />
          <Environment preset="apartment" />
        </Suspense>
      </Canvas>
      
      {showControls && (
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
    </div>
  );
} 