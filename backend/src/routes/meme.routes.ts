import express from 'express'
import { upload } from '../middleware/multerConfig';
import { addComment, addMeme, addReply, deleteComment, deleteReply, editComment, editReply, getComment, getComments, getMeme, getMemes, getReplies, getReply } from '../controllers/meme.controller';
import { validate } from '../middleware/jwtMiddleware';
export const memerouter = express.Router()

memerouter.get('/', validate, getMemes);
memerouter.get('/:id', validate, getMeme)
memerouter.post('/add', upload.single("file"),validate, addMeme)
memerouter.route('/:id/comment').post(validate, addComment).get(validate, getComments)
memerouter.route('/:id/comment/:id').get(validate, getComment).put(validate, editComment).delete(validate, deleteComment)
memerouter.route('/:id/comment/:id/reply').post(validate, addReply).get(validate, getReplies)
memerouter.route('/:id/comment/:id/reply/:id').get(validate, getReply).put(validate, editReply).delete(validate, deleteReply)
