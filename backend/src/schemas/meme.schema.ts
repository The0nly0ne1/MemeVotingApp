import mongoose from "mongoose";

const memeSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fileName: {type: String, require: true},
    filePath: {type: String, require: true},
    hash: { type: String, unique: true },
    name: {type: String, require: true},
    tags: [String],
    description: {type: String, default: ""},
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }]
}, {timestamps: true})

const commentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    meme: {type: mongoose.Schema.Types.ObjectId, ref: "memeId"},
    comment: String,
    replies: [{type: mongoose.Schema.Types.ObjectId, ref: "Reply"}]
}, {timestamps: true})

const replySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    comment: {type: mongoose.Schema.Types.ObjectId, ref: "commentId"},
    reply: String,
}, {timestamps: true})

export const Reply = mongoose.model("Reply", replySchema)

export const Comment = mongoose.model("Comment", commentSchema)

export const Meme = mongoose.model("Meme", memeSchema) 