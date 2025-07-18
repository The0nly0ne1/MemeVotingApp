import express from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import { memerouter } from './routes/meme.routes'
import { userRouter } from './routes/user.routes'
dotenv.config()
const port = process.env.PORT || 5000;

const app = express();

app.use(cookieParser())
app.use(express.json())
app.use(cors())

if (!process.env.MONGO_URL) {
    throw new Error('MONGO_URL environment variable is not defined');
}
mongoose.connect(process.env.MONGO_URL).then(() => {
    console.log("Connected to DB")
});

app.use(userRouter)
app.use(memerouter);

app.listen(port, () => {
    console.log(`Listening to port: ${port}`)
})