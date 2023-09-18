import {
  AccumulativeShadows,
  Html,
  RandomizedLight,
  Text3D,
  useFont,
} from "@react-three/drei";
import { motion } from "framer-motion-3d";
import { useAtom } from "jotai";
import { Suspense, useMemo, useRef } from "react";
import { LobbyAvatar } from "./LobbyAvatar";
import { Skyscraper } from "./Skyscraper";
import { roomIDAtom, roomsAtom, socket } from "./SocketManager";
import { Tablet } from "./Tablet";
import { avatarUrlAtom } from "./UI";
let firstLoad = true;
export const Lobby = () => {
  const [rooms] = useAtom(roomsAtom);
  const [avatarUrl] = useAtom(avatarUrlAtom);
  const [_roomID, setRoomID] = useAtom(roomIDAtom);
  const joinRoom = (roomId) => {
    socket.emit("joinRoom", roomId, {
      avatarUrl,
    });
    setRoomID(roomId);
  };

  const tablet = useRef();

  const goldenRatio = Math.min(1, window.innerWidth / 1600);

  const accumulativeShadows = useMemo(
    () => (
      <AccumulativeShadows
        temporal
        frames={30}
        alphaTest={0.85}
        scale={50}
        position={[0, 0, 0]}
        color="pink"
      >
        <RandomizedLight
          amount={4}
          radius={9}
          intensity={0.55}
          ambient={0.25}
          position={[5, 5, -20]}
        />
        <RandomizedLight
          amount={4}
          radius={5}
          intensity={0.25}
          ambient={0.55}
          position={[-5, 5, -20]}
        />
      </AccumulativeShadows>
    ),
    []
  );

  return (
    <group position-y={-1.5}>
      <motion.group
        ref={tablet}
        scale={0.22}
        position-x={-0.25 * goldenRatio}
        position-z={0.5}
        initial={{
          y: firstLoad ? 0.5 : 1.5,
          rotateY: Math.PI / 8,
        }}
        animate={{
          y: 1.5,
        }}
        transition={{
          duration: 1,
          delay: 0.5,
        }}
        onAnimationComplete={() => {
          firstLoad = false;
        }}
      >
        <Tablet scale={0.03} rotation-x={Math.PI / 2} />
        <Html position={[0, 0.17, 0.11]} transform scale={0.121}>
          <div className="w-[390px] max-w-full h-[514px] overflow-y-auto p-5  place-items-center pointer-events-none select-none">
            <div className="w-full overflow-y-auto flex flex-col space-y-2">
              <h1 className="text-center text-white text-2xl font-bold">
                WELCOME TO
                <br />
                WAWA MANSION
              </h1>
              <p className="text-center text-white">
                Please select a room to relax
              </p>
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="p-4 rounded-lg bg-slate-800 bg-opacity-70 text-white hover:bg-slate-950 transition-colors cursor-pointer pointer-events-auto"
                  onClick={() => joinRoom(room.id)}
                >
                  <p className="text-uppercase font-bold text-lg">
                    {room.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full ${
                        room.nbCharacters > 0 ? "bg-green-500" : "bg-orange-500"
                      }`}
                    ></div>
                    {room.nbCharacters} people in this room
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Html>
      </motion.group>
      <group position-z={-8} rotation-y={Math.PI / 6}>
        <Text3D
          font={"fonts/Inter_Bold.json"}
          position-z={1}
          size={0.3}
          position-x={-3}
          castShadow
          rotation-y={Math.PI / 8}
          bevelEnabled
          bevelThickness={0.005}
          letterSpacing={0.012}
        >
          MANSION
          <meshStandardMaterial color="white" />
        </Text3D>

        <Text3D
          font={"fonts/Inter_Bold.json"}
          position-z={2.5}
          size={0.3}
          position-x={-3}
          castShadow
          rotation-y={Math.PI / 8}
          bevelEnabled
          bevelThickness={0.005}
          letterSpacing={0.012}
        >
          WAWA
          <meshStandardMaterial color="white" />
        </Text3D>
        <Skyscraper scale={1.32} />
        <Skyscraper scale={1} position-x={-3} position-z={-1} />
        <Skyscraper scale={0.8} position-x={3} position-z={-0.5} />
      </group>
      {accumulativeShadows}
      <Suspense>
        <LobbyAvatar
          position-z={-1}
          position-x={0.5 * goldenRatio}
          rotation-y={-Math.PI / 8}
        />
      </Suspense>
    </group>
  );
};

useFont.preload("/fonts/Inter_Bold.json");
