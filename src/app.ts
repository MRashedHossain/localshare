import express, { Application } from "express"
import healthRouter from "@/routes/health"
import infoRouter from "@/routes/info"
import roomRouter from "@/routes/room"

function createApp(): Application {
    const app:Application = express()

    app.use(express.json())

    app.use("/info", infoRouter)

    app.use("/rooms", roomRouter)
    
    app.use("/health",healthRouter)

    return app
}

export default createApp