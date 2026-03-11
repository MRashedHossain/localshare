interface Room {
    code: string,
    hostId: string,
    devices: string[],
    createdAt: Date,
}

const rooms = new Map<string, Room>()

export function generateRoomCode(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function createRoom(hostId: string): Room {
    const code = generateRoomCode()

    const room: Room = {
        code,
        hostId,
        devices: [hostId],
        createdAt: new Date(),
    }

    rooms.set(code,room)

    return room
}

export function joinRoom(code: string , deviceId: string): Room | null {
    const room = rooms.get(code)

    if(!room)return null

    if(!room.devices.includes(deviceId)){
        room.devices.push(deviceId)
        rooms.set(code, room)
    }

    return room
}

export function leaveRoom(code: string , deviceId: string): void {
    const room = rooms.get(code)

    if(!room) return

    room.devices = room.devices.filter(id => id != deviceId)

    if(room.devices.length === 0){
        rooms.delete(code)
        console.log(`🗑️ Room ${code} deleted (empty)`)
    }else {
        rooms.set(code, room)
    }
}

export function getRoom(code: string): Room | null {
    return rooms.get(code) || null
}

export function getDeviceRoom(deviceId: string):string | null {
    for(const [code,room] of rooms){
        if(room.devices.includes(deviceId)){
            return code
        }
    }
    return null
}