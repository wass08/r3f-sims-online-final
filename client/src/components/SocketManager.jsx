import { atom, useAtom } from "jotai";
import { useEffect } from "react";
import { io } from "socket.io-client";

export const socket = io(import.meta.env.SERVER_URL || "http://localhost:3000");
export const charactersAtom = atom([]);
export const mapAtom = atom(null);
export const userAtom = atom(null);
export const itemsAtom = atom(null);
export const roomIDAtom = atom(null);
export const roomsAtom = atom([]);

export const SocketManager = () => {
  const [_characters, setCharacters] = useAtom(charactersAtom);
  const [_map, setMap] = useAtom(mapAtom);
  const [_user, setUser] = useAtom(userAtom);
  const [_items, setItems] = useAtom(itemsAtom);
  const [_rooms, setRooms] = useAtom(roomsAtom);
  useEffect(() => {
    function onConnect() {
      console.log("connected");
    }
    function onDisconnect() {
      console.log("disconnected");
    }

    function onRooms(value) {
      setRooms(value);
    }

    function onHello(value) {
      setMap(value.map);
      setUser(value.id);
      setItems(value.items);
      setCharacters(value.characters);
    }

    function onCharacters(value) {
      setCharacters(value);
    }

    function onMapUpdate(value) {
      setMap(value.map);
      setCharacters(value.characters);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("rooms", onRooms);
    socket.on("hello", onHello);
    socket.on("characters", onCharacters);
    socket.on("mapUpdate", onMapUpdate);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("rooms", onRooms);
      socket.off("hello", onHello);
      socket.off("characters", onCharacters);
      socket.off("mapUpdate", onMapUpdate);
    };
  }, []);
};
