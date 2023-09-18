import { useCursor, useGLTF } from "@react-three/drei";
import { useAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { SkeletonUtils } from "three-stdlib";
import { useGrid } from "../hooks/useGrid";
import { mapAtom } from "./SocketManager";
import { buildModeAtom } from "./UI";

export const Item = ({
  item,
  onClick,
  isDragging,
  dragPosition,
  canDrop,
  dragRotation,
}) => {
  const { name, gridPosition, size, rotation: itemRotation } = item;

  const rotation = isDragging ? dragRotation : itemRotation;
  const { gridToVector3 } = useGrid();
  const [map] = useAtom(mapAtom);
  const { scene } = useGLTF(`/models/items/${name}.glb`);
  // Skinned meshes cannot be re-used in threejs without cloning them
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const width = rotation === 1 || rotation === 3 ? size[1] : size[0];
  const height = rotation === 1 || rotation === 3 ? size[0] : size[1];
  const [hover, setHover] = useState(false);
  const [buildMode] = useAtom(buildModeAtom);
  useCursor(buildMode ? hover : undefined);

  useEffect(() => {
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, []);

  return (
    <group
      onClick={onClick}
      position={gridToVector3(
        isDragging ? dragPosition || gridPosition : gridPosition,
        width,
        height
      )}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <primitive object={clone} rotation-y={((rotation || 0) * Math.PI) / 2} />
      {isDragging && (
        <mesh>
          <boxGeometry
            args={[width / map.gridDivision, 0.2, height / map.gridDivision]}
          />
          <meshBasicMaterial
            color={canDrop ? "green" : "red"}
            opacity={0.3}
            transparent
          />
        </mesh>
      )}
    </group>
  );
};
