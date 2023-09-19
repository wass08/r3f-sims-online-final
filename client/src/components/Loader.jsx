import { useProgress } from "@react-three/drei";
import { useAtom } from "jotai";
import { itemsAtom } from "./SocketManager";

export const Loader = ({ loaded }) => {
  const { progress } = useProgress();
  const [items] = useAtom(itemsAtom);
  return (
    <div className="fixed w-screen h-screen top-0 left-0 grid place-items-center pointer-events-none select-none">
      <div
        className={`text-center transition-opacity duration-1000 ${
          progress === 100 || loaded ? "opacity-0" : ""
        }`}
      >
        <h1 className="font-bold text-5xl text-black">WAWA MANSION</h1>
        <div className="relative h-5">
          <div
            className="absolute top-0 left-0 h-full bg-black transition-all"
            style={{ width: `${!items ? 0 : progress}%` }}
          />
        </div>
        {progress < 100 && <p>Loading resources...</p>}
      </div>
    </div>
  );
};
