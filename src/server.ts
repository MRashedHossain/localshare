import dotenv from "dotenv"

dotenv.config()

import createApp from "@/app"
import { createServer } from "node:http"
import { setupSockets } from '@/sockets/index'

const PORT: number = parseInt(process.env.PORT || '3000',10)

const app = createApp()

const httpServer = createServer(app)

setupSockets(httpServer)

httpServer.listen(PORT, () => {
  console.log(`\n🚀 LocalShare is running!`);
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSockets: ready!\n`);
})