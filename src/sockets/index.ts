import { createRoom, joinRoom, leaveRoom, getDeviceRoom, getRoom } from '@/services/room';
import {Server as HTTPServer} from 'http'
import {Server, Socket} from 'socket.io'
import {
  FileMetaData,
  TransferSession,
  generateTransferId,
  createTransferSession,
  addChunk,
  isTransferComplete,
  assembleFile,
  removeTransferSession,
  cancelDeviceTransfers,
} from '@/services/transfer'
import { disconnect } from 'cluster';

interface Device {
    id: string,
    name: string,
    ip: string,
    joinedAt: Date
}

const connectedDevices = new Map<string, Device>()

export function setupSockets(httpserver: HTTPServer): void {
    const io = new Server(httpserver,{
        cors: {
            origin: "*"
        },
    })

    io.on('connection', (socket: Socket) => {
        const deviceIP = socket.handshake.address

        const device: Device = {
            id: socket.id,
            name: `Device-${socket.id.slice(0,4)}`,
            ip: deviceIP,
            joinedAt: new Date(),
        }

        connectedDevices.set(socket.id,device)

        console.log(`✅ Device connected: ${device.name} (${device.ip})`)
        console.log(`📊 Total devices: ${connectedDevices.size}`)

        socket.emit('welcome',{
            message: 'Connected to LocalShare!',
            yourDevice: device
        })

        socket.broadcast.emit('device-joined',{
            device,
            totalDevices: connectedDevices.size
        })

        socket.emit('device-list',{
            devices: Array.from(connectedDevices.values())
        })
        
        socket.on('rename-device', (data: { newName: string }) => {
            const device = connectedDevices.get(socket.id)
            if(device){
                device.name = data.newName
                connectedDevices.set(socket.id,device)
                socket.broadcast.emit('device-renamed',{
                    device,
                    totalDevices: connectedDevices.size
                })
            }
        })

        socket.on('create-room', () => {
            const room = createRoom(socket.id)

            socket.join(room.code)

            socket.emit('room-created', {room})

            console.log(`🏠 Room created: ${room.code} by ${device.name}`);
        })

        socket.on('join-room',(data: {code: string}) => {
            const room = joinRoom(data.code.toUpperCase(),socket.id)

            if(!room){
                socket.emit('room-error', { message: `Room ${data.code} not found` })
                return  
            }

            socket.join(data.code.toUpperCase())

            socket.emit('room-joined',{room})

            socket.to(room.code).emit('device-joined-room',{
                device,
                totalDevices: room.devices.length
            })

            console.log(`✅ ${device.name} joined room: ${room.code}`)
        })

        socket.on('leave- room',(data: {code: string}) => {
            leaveRoom(data.code, socket.id)

            socket.leave(data.code)

            socket.emit('room-left', {code: data.code})

            socket.to(data.code).emit('device-left-room', {
                device,
                totalDevices: 0
            })

            console.log(`👋 ${device.name} left room: ${data.code}`)
        })

        socket.on('disconnect', () => {
            const roomCode = getDeviceRoom(socket.id)

            if (roomCode) {
                leaveRoom(roomCode, socket.id)

                const room = getRoom(roomCode)
                if(!room) return
                const updatedDevices = room.devices.map(id => connectedDevices.get(id)).filter(Boolean)

                io.to(roomCode).emit('room-devices',{devices: updatedDevices})

                socket.to(roomCode).emit('device-left-room', {
                device,
                totalDevices: 0,
                })
            }

            const cancelledSessions = cancelDeviceTransfers(socket.id)

            for(const session of cancelledSessions){
                const otherDeviceId = session.metadata.senderId === socket.id?session.metadata.receiverId:session.metadata.senderId
                io.to(otherDeviceId).emit('transfer-cancelled', {
                    transferId: session.metadata.transferId,
                    reason: `${device.name} disconnected`
                })
                console.log(`❌ Cancelled transfer ${session.metadata.transferId} due to disconnect`)
            }

            connectedDevices.delete(socket.id)
            console.log(`❌ Device disconnected: ${device.name}`);
            console.log(`📊 Total devices: ${connectedDevices.size}`);
            io.emit('device-left',{
                deviceId: socket.id,
                deviceName: device.name,
                totalDevices: connectedDevices.size
            })
        })

        socket.on('transfer-request', (data:{
            receiverId: string
            fileName: string
            fileSize: number
            fileType: string
            totalChunks: number
        }) => {
            const transferId = generateTransferId();
              const metadata: FileMetaData = {
                transferId,
                fileName: data.fileName,
                fileSize: data.fileSize,
                fileType: data.fileType,
                totalChunks: data.totalChunks,
                senderId: socket.id,
                receiverId: data.receiverId,
            }
            socket.to(data.receiverId).emit('transfer-incoming', {metadata})
            socket.emit('transfer-requested', { transferId, metadata })
            console.log(`📤 Transfer request: ${data.fileName} → ${data.receiverId}`);
        })
        
        socket.on('transfer-accept', (data: {transferId: string,metadata: FileMetaData})=> {
            createTransferSession(data.metadata)
            socket.to(data.metadata.senderId).emit('transfer-accepted', {
                transferId: data.transferId
            })
            console.log(`✅ Transfer accepted: ${data.transferId}`);
        })

        socket.on('transfer-chunk', (data: {
            transferId: string,
            chunkIndex: number,
            chunk: ArrayBuffer,
            receiverId: string
        }) => {
            const chunkBuffer = Buffer.from(data.chunk)
            const session = addChunk(data.transferId,chunkBuffer)
              if (!session) {
                socket.emit('transfer-error', { message: 'Transfer session not found' })
                return;
            }

            socket.to(data.receiverId).emit('transfer-progress', {
                transferId: data.transferId,
                receivedChunks: session.receivedChunks,
                totalChunks: session.metadata.totalChunks,
                percentage: Math.round((session.receivedChunks / session.metadata.totalChunks) * 100)
            })

            if(isTransferComplete(session)){
                const fileBuffer = assembleFile(session)
                const base64File = fileBuffer.toString('base64')
                socket.to(data.receiverId).emit('transfer-complete', {
                    transferId: data.transferId,
                    fileName: session.metadata.fileName,
                    fileType: session.metadata.fileType,
                    fileData: base64File,
                })
                socket.emit('transfer-done', { transferId: data.transferId })
                removeTransferSession(data.transferId)
                console.log(`✅ Transfer complete: ${session.metadata.fileName}`)
            }

        })

        socket.on('get-room-devices', (data: {roomCode: string}) => {
            const room = getRoom(data.roomCode)
            if(!room){
                socket.emit('room-error', {message: 'Room not found'})
                return
            }

            const devices = room.devices.map(id => connectedDevices.get(id))

            socket.emit('room-devices', {devices})
        })

        socket.on('transfer-reject', (data: { transferId: string, senderId: string }) => {
            removeTransferSession(data.transferId);
            socket.to(data.senderId).emit('transfer-rejected', {
                transferId: data.transferId,
            });
            console.log(`❌ Transfer rejected: ${data.transferId}`)
        })
        socket.on('transfer-cancel', (data: {transferId: string, receiverId: string}) => {
            removeTransferSession(data.transferId)
            socket.to(data.receiverId).emit('transfer-cancelled', {
                transferId: data.transferId
            })
            console.log(`❌ Transfer cancelled: ${data.transferId}`)
        })
    })
}