import { profile } from "console";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username: {type: String, require: true},
    email: {type: String, require: true},
    password: {type: String, require: true},
    follower: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Followers' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Following' }],
    friend: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Friends' }],
    memes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Memes' }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comments' }],
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'replies' }],
    profile: {type: mongoose.Schema.Types.ObjectId, ref: "Profile"},
    refreshToken: String
}, {timestamps: true})

const profileSchema = new mongoose.Schema({
  user: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
  profilePictureName: {type: String, default: "default-profile-picture.jpg"},
  profilePicturePath: {type: String, default: "src\\uploads\\default-profile-picture.jpg"},
  displayName: String,
  bio: {type: String, default: ""},
  interest: [String]
}, {timestamps: true})

const refreshTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  });
  
export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export const User = mongoose.model("User", userSchema)

export const Profile = mongoose.model('Profile', profileSchema)