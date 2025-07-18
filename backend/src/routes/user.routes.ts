import express from 'express'
import { login, register, refresh, logout, getUser, createProfile, follow, unfollow } from '../controllers/user.controller'
export const userRouter = express.Router()

userRouter.post('/login', login)
userRouter.post('/register', register, createProfile)
userRouter.post('/refresh', refresh)
userRouter.post('/logout', logout)
userRouter.get('/profile/:id', getUser)
userRouter.post('/profile/:id/follow', follow)
userRouter.get('/profile/:id/unfollow', unfollow)