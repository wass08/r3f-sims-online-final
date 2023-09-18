import fs from "fs";
import pathfinding from "pathfinding";
import { Server } from "socket.io";

const origin = process.env.CLIENT_URL || "http://localhost:5173";
const io = new Server({
  cors: {
    origin,
  },
});

io.listen(3000);

console.log("Server started on port 3000, allowed cors origin: " + origin);

// PATHFINDING UTILS

const finder = new pathfinding.AStarFinder({
  allowDiagonal: true,
  dontCrossCorners: true,
});

const findPath = (room, start, end) => {
  const gridClone = room.grid.clone();
  const path = finder.findPath(start[0], start[1], end[0], end[1], gridClone);
  return path;
};

const updateGrid = (room) => {
  // RESET GRID FOR ROOM
  for (let x = 0; x < room.size[0] * room.gridDivision; x++) {
    for (let y = 0; y < room.size[1] * room.gridDivision; y++) {
      room.grid.setWalkableAt(x, y, true);
    }
  }

  room.items.forEach((item) => {
    if (item.walkable || item.wall) {
      return;
    }
    const width =
      item.rotation === 1 || item.rotation === 3 ? item.size[1] : item.size[0];
    const height =
      item.rotation === 1 || item.rotation === 3 ? item.size[0] : item.size[1];
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        room.grid.setWalkableAt(
          item.gridPosition[0] + x,
          item.gridPosition[1] + y,
          false
        );
      }
    }
  });
};

// ROOMS MANAGEMENT
const rooms = [];

const loadRooms = async () => {
  let data;
  try {
    data = fs.readFileSync("rooms.json", "utf8");
  } catch (ex) {
    console.log("No rooms.json file found, using default file");
    try {
      data = fs.readFileSync("default.json", "utf8");
    } catch (ex) {
      console.log("No default.json file found, exiting");
      process.exit(1);
    }
  }
  data = JSON.parse(data);
  data.forEach((roomItem) => {
    const room = {
      ...roomItem,
      size: [7, 7], // HARDCODED FOR SIMPLICITY PURPOSES
      gridDivision: 2,
      characters: [],
    };
    room.grid = new pathfinding.Grid(
      room.size[0] * room.gridDivision,
      room.size[1] * room.gridDivision
    );
    updateGrid(room);
    rooms.push(room);
  });
};

loadRooms();

// UTILS

const generateRandomPosition = (room) => {
  // TO AVOID INFINITE LOOP WE LIMIT TO 100, BEST WOULD BE TO CHECK IF THERE IS ENOUGH SPACE LEFT 🤭
  for (let i = 0; i < 100; i++) {
    const x = Math.floor(Math.random() * room.size[0] * room.gridDivision);
    const y = Math.floor(Math.random() * room.size[1] * room.gridDivision);
    if (room.grid.isWalkableAt(x, y)) {
      return [x, y];
    }
  }
};

// SOCKET MANAGEMENT

io.on("connection", (socket) => {
  try {
    let room = null;
    let character = null;

    socket.emit("welcome", {
      rooms: rooms.map((room) => ({
        id: room.id,
        name: room.name,
        nbCharacters: room.characters.length,
      })),
      items,
    });

    socket.on("joinRoom", (roomId, opts) => {
      room = rooms.find((room) => room.id === roomId);
      if (!room) {
        return;
      }
      socket.join(room.id);
      character = {
        id: socket.id,
        session: parseInt(Math.random() * 1000),
        position: generateRandomPosition(room),
        avatarUrl: opts.avatarUrl,
      };
      room.characters.push(character);

      socket.emit("roomJoined", {
        map: {
          gridDivision: room.gridDivision,
          size: room.size,
          items: room.items,
        },
        characters: room.characters,
        id: socket.id,
      });
      onRoomUpdate();
    });

    const onRoomUpdate = () => {
      io.to(room.id).emit("characters", room.characters);
      io.emit(
        "rooms",
        rooms.map((room) => ({
          id: room.id,
          name: room.name,
          nbCharacters: room.characters.length,
        }))
      );
    };

    socket.on("leaveRoom", () => {
      if (!room) {
        return;
      }
      socket.leave(room.id);
      room.characters.splice(
        room.characters.findIndex((character) => character.id === socket.id),
        1
      );
      onRoomUpdate();
      room = null;
    });

    socket.on("characterAvatarUpdate", (avatarUrl) => {
      character.avatarUrl = avatarUrl;
      io.to(room.id).emit("characters", room.characters);
    });

    socket.on("move", (from, to) => {
      const path = findPath(room, from, to);
      if (!path) {
        return;
      }
      character.position = from;
      character.path = path;
      io.to(room.id).emit("playerMove", character);
    });

    socket.on("dance", () => {
      io.to(room.id).emit("playerDance", {
        id: socket.id,
      });
    });

    socket.on("chatMessage", (message) => {
      io.to(room.id).emit("playerChatMessage", {
        id: socket.id,
        message,
      });
    });

    socket.on("passwordCheck", (password) => {
      if (password === room.password) {
        socket.emit("passwordCheckSuccess");
        character.canUpdateRoom = true;
      } else {
        socket.emit("passwordCheckFail");
      }
    });

    socket.on("itemsUpdate", async (items) => {
      if (!character.canUpdateRoom) {
        return;
      }
      if (!items || items.length === 0) {
        return; // security
      }
      room.items = items;
      updateGrid(room);
      room.characters.forEach((character) => {
        character.path = [];
        character.position = generateRandomPosition(room);
      });
      io.to(room.id).emit("mapUpdate", {
        map: {
          gridDivision: room.gridDivision,
          size: room.size,
          items: room.items,
        },
        characters: room.characters,
      });

      fs.writeFileSync("rooms.json", JSON.stringify(rooms, null, 2));
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
      if (room) {
        room.characters.splice(
          room.characters.findIndex((character) => character.id === socket.id),
          1
        );
        onRoomUpdate();
        room = null;
      }
    });
  } catch (ex) {
    console.log(ex); // Big try catch to avoid crashing the server (best would be to handle all errors properly...)
  }
});

// ROOMS

// SHOP ITEMS
const items = {
  washer: {
    name: "washer",
    size: [2, 2],
  },
  toiletSquare: {
    name: "toiletSquare",
    size: [2, 2],
  },
  trashcan: {
    name: "trashcan",
    size: [1, 1],
  },
  bathroomCabinetDrawer: {
    name: "bathroomCabinetDrawer",
    size: [2, 2],
  },
  bathtub: {
    name: "bathtub",
    size: [4, 2],
  },
  bathroomMirror: {
    name: "bathroomMirror",
    size: [2, 1],
    wall: true,
  },
  bathroomCabinet: {
    name: "bathroomCabinet",
    size: [2, 1],
    wall: true,
  },
  bathroomSink: {
    name: "bathroomSink",
    size: [2, 2],
  },
  showerRound: {
    name: "showerRound",
    size: [2, 2],
  },
  tableCoffee: {
    name: "tableCoffee",
    size: [4, 2],
  },
  loungeSofaCorner: {
    name: "loungeSofaCorner",
    size: [5, 5],
    rotation: 2,
  },
  bear: {
    name: "bear",
    size: [2, 1],
    wall: true,
  },
  loungeSofaOttoman: {
    name: "loungeSofaOttoman",
    size: [2, 2],
  },
  tableCoffeeGlassSquare: {
    name: "tableCoffeeGlassSquare",
    size: [2, 2],
  },
  loungeDesignSofaCorner: {
    name: "loungeDesignSofaCorner",
    size: [5, 5],
    rotation: 2,
  },
  loungeDesignSofa: {
    name: "loungeDesignSofa",
    size: [5, 2],
    rotation: 2,
  },
  loungeSofa: {
    name: "loungeSofa",
    size: [5, 2],
    rotation: 2,
  },
  bookcaseOpenLow: {
    name: "bookcaseOpenLow",
    size: [2, 1],
  },
  bookcaseClosedWide: {
    name: "bookcaseClosedWide",
    size: [3, 1],
    rotation: 2,
  },
  bedSingle: {
    name: "bedSingle",
    size: [3, 6],
    rotation: 2,
  },
  bench: {
    name: "bench",
    size: [2, 1],
    rotation: 2,
  },
  bedDouble: {
    name: "bedDouble",
    size: [5, 5],
    rotation: 2,
  },
  benchCushionLow: {
    name: "benchCushionLow",
    size: [2, 1],
  },
  loungeChair: {
    name: "loungeChair",
    size: [2, 2],
    rotation: 2,
  },
  cabinetBedDrawer: {
    name: "cabinetBedDrawer",
    size: [1, 1],
    rotation: 2,
  },
  cabinetBedDrawerTable: {
    name: "cabinetBedDrawerTable",
    size: [1, 1],
    rotation: 2,
  },
  table: {
    name: "table",
    size: [4, 2],
  },
  tableCrossCloth: {
    name: "tableCrossCloth",
    size: [4, 2],
  },
  plant: {
    name: "plant",
    size: [1, 1],
  },
  plantSmall: {
    name: "plantSmall",
    size: [1, 1],
  },
  rugRounded: {
    name: "rugRounded",
    size: [6, 4],
    walkable: true,
  },
  rugRound: {
    name: "rugRound",
    size: [4, 4],
    walkable: true,
  },
  rugSquare: {
    name: "rugSquare",
    size: [4, 4],
    walkable: true,
  },
  rugRectangle: {
    name: "rugRectangle",
    size: [8, 4],
    walkable: true,
  },
  televisionVintage: {
    name: "televisionVintage",
    size: [4, 2],
    rotation: 2,
  },
  televisionModern: {
    name: "televisionModern",
    size: [4, 2],
    rotation: 2,
  },
  kitchenFridge: {
    name: "kitchenFridge",
    size: [2, 1],
    rotation: 2,
  },
  kitchenFridgeLarge: {
    name: "kitchenFridgeLarge",
    size: [2, 1],
  },
  kitchenBar: {
    name: "kitchenBar",
    size: [2, 1],
  },
  kitchenCabinetCornerRound: {
    name: "kitchenCabinetCornerRound",
    size: [2, 2],
  },
  kitchenCabinetCornerInner: {
    name: "kitchenCabinetCornerInner",
    size: [2, 2],
  },
  kitchenCabinet: {
    name: "kitchenCabinet",
    size: [2, 2],
  },
  kitchenBlender: {
    name: "kitchenBlender",
    size: [1, 1],
  },
  dryer: {
    name: "dryer",
    size: [2, 2],
  },
  chairCushion: {
    name: "chairCushion",
    size: [1, 1],
    rotation: 2,
  },
  chair: {
    name: "chair",
    size: [1, 1],
    rotation: 2,
  },
  deskComputer: {
    name: "deskComputer",
    size: [3, 2],
  },
  desk: {
    name: "desk",
    size: [3, 2],
  },
  chairModernCushion: {
    name: "chairModernCushion",
    size: [1, 1],
    rotation: 2,
  },
  chairModernFrameCushion: {
    name: "chairModernFrameCushion",
    size: [1, 1],
    rotation: 2,
  },
  kitchenMicrowave: {
    name: "kitchenMicrowave",
    size: [1, 1],
  },
  coatRackStanding: {
    name: "coatRackStanding",
    size: [1, 1],
  },
  kitchenSink: {
    name: "kitchenSink",
    size: [2, 2],
  },
  lampRoundFloor: {
    name: "lampRoundFloor",
    size: [1, 1],
  },
  lampRoundTable: {
    name: "lampRoundTable",
    size: [1, 1],
  },
  lampSquareFloor: {
    name: "lampSquareFloor",
    size: [1, 1],
  },
  lampSquareTable: {
    name: "lampSquareTable",
    size: [1, 1],
  },
  toaster: {
    name: "toaster",
    size: [1, 1],
  },
  kitchenStove: {
    name: "kitchenStove",
    size: [2, 2],
  },
  laptop: {
    name: "laptop",
    size: [1, 1],
  },
  radio: {
    name: "radio",
    size: [1, 1],
  },
  speaker: {
    name: "speaker",
    size: [1, 1],
  },
  speakerSmall: {
    name: "speakerSmall",
    size: [1, 1],
    rotation: 2,
  },
  stoolBar: {
    name: "stoolBar",
    size: [1, 1],
  },
  stoolBarSquare: {
    name: "stoolBarSquare",
    size: [1, 1],
  },
};
