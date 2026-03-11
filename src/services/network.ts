import os from "os"
import * as QRCode from 'qrcode'

interface ServerInfo {
    localIP: string
    port: number
    url: string
}

function getLocalIP(): string {
    const interfaces = os.networkInterfaces()

    for (const addresses of Object.values(interfaces).filter(Boolean) as os.NetworkInterfaceInfo[][]) {
        for (const address of addresses) {
            if (address.family === 'IPv4' && !address.internal) {
                return address.address
            }
        }
    }
    return '127.0.0.1'
}

export function getServerInfo(port: number): ServerInfo {
    const localIP = getLocalIP()

    return {
        localIP,
        port,
        url: `http://${localIP}:${port}`
    }
}

export async function generateQRCode(url: string): Promise<string> {
  const qr = await QRCode.toString(url, { type: 'utf8' });
  return qr;
}

export async function generateQRCodeImage(url: string): Promise<string> {
  const qrImage = await QRCode.toDataURL(url);
  return qrImage;
}