import { getServerInfo,generateQRCode } from "@/services/network";
import { Router, Request, Response, } from "express";
import * as QRCode from 'qrcode'

const router: Router = Router()

router.get("/", async (req: Request, res: Response) => {
    const ServerInfo = getServerInfo(Number(process.env.PORT || 3000))
    const qr = await generateQRCode(ServerInfo.url)
    console.log(qr)
    res.json({
        localIP: ServerInfo.localIP,
        port: ServerInfo.port,
        url: ServerInfo.url,
        qrCode: qr
    })
})

router.get("/qr", async (req: Request, res: Response) => {
  const customUrl = req.query.url as string;
  const serverInfo = getServerInfo(Number(process.env.PORT) || 3000);
  const targetUrl = customUrl || serverInfo.url;

  const qrImage = await QRCode.toDataURL(targetUrl);
  res.json({ qrImage });
});

export default router