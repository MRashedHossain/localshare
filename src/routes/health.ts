import { Router, Request, Response } from "express";
import { timeStamp } from "node:console";

const router: Router = Router()

router.get("/", (req:Request , res:Response) => {
    res.json({
        status: "ok",
        message: "LocalShare is running",
        timestamp: new Date().toISOString(),
    })
})

router.get("/details",(req:Request, res: Response) => {
    res.json({
        appName: process.env.APP_NAME,
        nodeVersion: process.version,
        uptime: process.uptime()
    })
})

export default router