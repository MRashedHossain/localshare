import { Router, Request, Response, } from "express";
import { getRoom } from "@/services/room";

const router: Router = Router()

router.get("/:code", async (req: Request, res: Response) => {
    const code = String(req.params.code).toUpperCase()
    const room = getRoom(code as string)

    if(!room){
        res.status(404).json({message: "room not found"})
        return
    }

    res.status(200).json({room})
})

export default router