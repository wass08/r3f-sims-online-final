import { Canvas } from "@react-three/fiber";
// import { EffectComposer, N8AO } from "@react-three/postprocessing";
import { ScrollControls, useProgress } from "@react-three/drei";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { Experience } from "./components/Experience";
import { SocketManager, roomIDAtom } from "./components/SocketManager";
import { UI } from "./components/UI";

function App() {
  const [roomID] = useAtom(roomIDAtom);

  const { progress } = useProgress();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (progress === 100) {
      setLoaded(true); // As progress can go back to 0 when new resources are loaded, we need to make sure we don't fade out the UI when that happens
    }
  }, [progress]);
  return (
    <>
      <SocketManager />
      <Canvas
        shadows
        camera={{
          position: [0, 8, 2],
          fov: 30,
        }}
      >
        <color attach="background" args={["#ffffff"]} />
        <ScrollControls pages={roomID ? 4 : 0}>
          <Experience loaded={loaded} />
        </ScrollControls>

        {/* <EffectComposer>
          <N8AO intensity={0.42} />
        </EffectComposer> */}
      </Canvas>
      {loaded && <UI />}
    </>
  );
}

export default App;
