import { useState, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

import Grass from './Grass'

export default function GroundAndGrass({ setTargetPosition }) {
  const { camera, size } = useThree()
  const [panelProps, setPanelProps] = useState({ args: [10, 10], position: [0, 0, 0] })

  useEffect(() => {
    camera.updateMatrixWorld();
    
    const raycasterTopLeft = new THREE.Raycaster();
    raycasterTopLeft.setFromCamera(new THREE.Vector2(-1, 1), camera);
    const raycasterTopRight = new THREE.Raycaster();
    raycasterTopRight.setFromCamera(new THREE.Vector2(1, 1), camera);
    const raycasterBottomLeft = new THREE.Raycaster();
    raycasterBottomLeft.setFromCamera(new THREE.Vector2(-1, -1), camera);
    
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    
    const topLeftIntersect = new THREE.Vector3();
    const topRightIntersect = new THREE.Vector3();
    const bottomLeftIntersect = new THREE.Vector3();
    
    raycasterTopLeft.ray.intersectPlane(groundPlane, topLeftIntersect);
    raycasterTopRight.ray.intersectPlane(groundPlane, topRightIntersect);
    raycasterBottomLeft.ray.intersectPlane(groundPlane, bottomLeftIntersect);
    
    if (topLeftIntersect.z !== undefined && topRightIntersect.z !== undefined && bottomLeftIntersect.z !== undefined) {
      const zFar = topLeftIntersect.z;
      const zNear = bottomLeftIntersect.z;
      
      const width = topRightIntersect.x - topLeftIntersect.x;
      const depth = Math.abs(zNear - zFar);
      
      const centerZ = (zFar + zNear) / 2;
      
      setPanelProps({
        args: [width, depth],
        position: [0, 0, centerZ]
      });
    }
  }, [camera, size]);

  const handlePointerMove = (e) => {
    setTargetPosition([e.point.x, 0.5, e.point.z])
  }

  // Calculate density based on visible area
  const area = panelProps.args[0] * panelProps.args[1];
  const count = Math.min(Math.floor(area * 500), 100000); // 500 blades per sq unit, max 100k

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={panelProps.position}
        onPointerMove={handlePointerMove}
      >
        <planeGeometry args={panelProps.args} />
        {/* Adjusted ground color to blend with grass base */}
        <meshStandardMaterial color="#0a1a0a" roughness={0.8} />
      </mesh>
      
      <Grass 
        count={count} 
        width={panelProps.args[0]} 
        depth={panelProps.args[1]} 
        centerZ={panelProps.position[2]} 
      />
    </group>
  )
}
