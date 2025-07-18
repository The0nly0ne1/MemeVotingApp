import { Request, Response } from "express";
import fs from 'fs'
import jwt from 'jsonwebtoken'
import { Meme, Comment, Reply } from "../schemas/meme.schema"
import { User } from "../schemas/user.schema";
import { getFileHash } from "../utils/fileHash";

export const getMemes = async (req: Request, res: Response) => {
    try {
        const response = await Meme.find()
        res.status(200).json(response)
    } catch (err){
        console.log("Failed to fetch memes: " + err)
        res.status(500).json({ error: "Failed to fetch memes" });
    }
}

export const getMeme = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const response = await Meme.findById(id);
        if (!response) {
            return res.status(404).json({ error: "Meme not found" });
        }
        res.status(200).json(response);
    } catch (err){
        console.log("Failed to fetch meme: " + err)
        res.status(500).json({ error: "Failed to fetch meme" });
    }
}

export const addMeme = async (req: Request, res: Response) => {
    const { name, description } = req.body
    const file = req.file
    const token = req.headers['authorization']?.split(' ')[1];
    const accessToken = process.env.ACCESS_TOKEN;

    if (!token || !accessToken) {
        return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    let decoded, user;
    try {
        decoded = jwt.verify(token, accessToken);
        user = typeof decoded === "object" && "id" in decoded ? decoded.id : undefined;
    } catch (err) {
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
    if (!user) {
        return res.status(401).json({ error: "Unauthorized: User not found in token" });
    }

    if (!name) {
        return res.status(400).send("Enter a name!");
    }

    const existing = await Meme.findOne({ name });
    if (existing) {
        return res.status(409).send("Name already exists!");
    }

    if (!file) {
        return res.status(400).send("Upload a file!");
    }
    
    const fileName = file?.filename
    const filePath = file?.path

    if (filePath) {
        const hash = getFileHash(filePath);
        const existing = await Meme.findOne({ hash });
        if (existing) {
            if (filePath) {
                fs.unlinkSync(filePath);
            }
            return res.status(409).json({ error: 'Meme already exists (duplicate content)' });
        }

        try {
            const response =  new Meme({
                user,
                hash,
                fileName,
                filePath,
                name,
                description,
            })
            await response.save()
            await User.findByIdAndUpdate(user, { $push: {memes: response._id}})
            res.status(201).json(response)
        } catch (err){
            console.log('Failed adding Meme: ' + err)
            res.status(500).send("Failed adding Meme: " + err)
        }
    }
}

export const addComment = async (req: Request, res: Response) => {
    const { comment } = req.body;
    const { id } = req.params;
    const token = req.headers['authorization']?.split(' ')[1];
    const accessToken = process.env.ACCESS_TOKEN;

    if (!token || !accessToken) {
        return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    let decoded, user;
    try {
        decoded = jwt.verify(token, accessToken);
        user = typeof decoded === "object" && "id" in decoded ? decoded.id : undefined;
    } catch (err) {
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
    if (!user) {
        return res.status(401).json({ error: "Unauthorized: User not found in token" });
    }

    if (!comment) {
        return res.status(400).send("Don't leave the field blank");
    }

    try {
        const response = new Comment({
            user,
            meme: id,
            comment
        });

        await response.save();
        await User.findByIdAndUpdate(user, { $push: {comments: response._id}})
        await Meme.findByIdAndUpdate(id, { $push: { comments: response._id } });

        return res.status(201).json(response);
    } catch (err) {
        console.log("Failed to add comment: " + err);
        return res.status(500).send("Failed to add comment");
    }
};

export const getComments = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Find the meme by id and populate its comments
        const meme = await Meme.findById(id).populate('comments');
        if (!meme) {
            return res.status(404).json({ error: 'Meme not found' });
        }
        res.status(200).json(meme.comments);
    } catch (err) {
        console.log("Failed to fetch comments: " + err);
        res.status(500).send("Failed to fetch comments: " + err);
    }
}

export const addReply = async (req: Request, res: Response) => {
    const { reply } = req.body;
    const { id } = req.params;
    const token = req.headers['authorization']?.split(' ')[1];
    const accessToken = process.env.ACCESS_TOKEN;

    if (!token || !accessToken) {
        return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    let decoded, user;
    try {
        decoded = jwt.verify(token, accessToken);
        user = typeof decoded === "object" && "id" in decoded ? decoded.id : undefined;
    } catch (err) {
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
    if (!user) {
        return res.status(401).json({ error: "Unauthorized: User not found in token" });
    }

    if (!reply) {
        return res.status(400).send("Don't leave the field blank");
    }

    try {
        const response = new Reply({
            user,
            comment: id,
            reply
        });

        await response.save();
        await User.findByIdAndUpdate(user, { $push: {replies: response._id}})
        await Comment.findByIdAndUpdate(id, { $push: { replies: response._id } });

        return res.status(201).json(response);
    } catch (err) {
        console.log("Failed to add reply: " + err);
        return res.status(500).send("Failed to add reply");
    }
};

export const getReplies = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Find the meme by id and populate its comments
        const comment = await Comment.findById(id).populate('replies');
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        res.status(200).json(comment.replies);
    } catch (err) {
        console.log("Failed to fetch replies: " + err);
        res.status(500).send("Failed to fetch replies: " + err);
    }
}

export const deleteMeme = async (req: Request, res: Response) => {
    const { id } = req.params
    try {
        const meme = await Meme.findByIdAndDelete(id)
        await User.findByIdAndUpdate(meme?.user, { $pull: {memes: meme?._id}})
        res.status(200).json({
            message: "Meme deleted",
            meme
        })
    } catch (err) {
        res.sendStatus(500)
    }
}

export const deleteComment = async (req: Request, res: Response) => {
    const { id } = req.params
    try {
        const response = await Comment.findByIdAndDelete(id)
        await User.findByIdAndUpdate(response?.user, { $pull: {comments: response?._id}})
        await Meme.findByIdAndUpdate(response?.meme, { $pull: { comments: response?._id}})
        res.status(200).json({
            message: "Comment deleted",
            response
        })
    } catch (err) {
        console.log(err)
        res.sendStatus(500)
    }
}

export const deleteReply = async (req: Request, res: Response) => {
    const { id } = req.params
    try {
        const response = await Reply.findByIdAndDelete(id)
        await User.findByIdAndUpdate(response?.user, { $pull: {replies: response?._id}})
        await Comment.findByIdAndUpdate(response?.comment, { $pull: { replies: response?._id}})
        res.status(200).json({
            message: "Reply deleted",
            response
        })
    } catch (err) {
        console.log(err)
        res.sendStatus(500)
    }
}

export const editComment = async (req: Request, res: Response) => {
    const { id } = req.params
    const { comment } = req.body

    if (!comment) {
        return res.status(400).send("Comment cannot be empty");
    }

    try {
        const repsonse = await Comment.findByIdAndUpdate(id, {comment: comment}, { new: true })
        res.status(200).json(repsonse)
    } catch (err){
        console.log(err)
        res.sendStatus(500)
    }
}

export const editReply = async (req: Request, res: Response) => {
    const { id } = req.params
    const { reply } = req.body

    if (!reply) {
        return res.status(400).send("Reply cannot be empty");
    }

    try {
        const response = await Reply.findByIdAndUpdate(id, { reply: reply }, { new: true });
        res.status(200).json(response);
    } catch (err){
        console.log(err)
        res.sendStatus(500)
    }
}

export const getComment = async (req: Request, res: Response) => {
    const { id } = req.params
    try {
        const response = await Comment.findById(id)
        res.status(200).json(response)
    } catch (err) {
        console.log(err)
        res.sendStatus(500)
    }
}

export const getReply = async (req: Request, res: Response) => {
    const { id } = req.params
    try {
        const response = await Reply.findById(id)
        res.status(200).json(response)
    } catch (err) {
        console.log(err)
        res.sendStatus(500)
    }
}


