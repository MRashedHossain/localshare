export interface FileMetaData{
    transferId: string,
    fileName: string,
    fileSize: number,
    fileType: string,   
    totalChunks: number,
    senderId: string,
    receiverId: string
}

export interface TransferSession {
    metadata: FileMetaData,
    chunks: Uint8Array[],
    receivedChunks: number,
    startedAt: Date
}

const activeSessions = new Map<string, TransferSession>()

export function generateTransferId(): string {
  return `transfer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createTransferSession(metadata: FileMetaData): TransferSession {
    const session: TransferSession = {
        metadata,
        chunks: [],
        receivedChunks: 0,
        startedAt: new Date()
    }
    activeSessions.set(metadata.transferId,session)
    return session
}

export function addChunk(transferId: string, chunk: Uint8Array):TransferSession | null {
    const session = activeSessions.get(transferId)
    if(!session)return null

    session.chunks.push(chunk)
    session.receivedChunks++
    activeSessions.set(transferId, session)
    return session
}

export function isTransferComplete(session: TransferSession): boolean {
    return session.receivedChunks === session.metadata.totalChunks
}

export function assembleFile(session: TransferSession): Buffer {
  return Buffer.concat(session.chunks)
}

export function removeTransferSession(transferId: string): void {
  activeSessions.delete(transferId);
}