import { Request, response, Response } from "express";
import bcrypt from 'bcrypt'
import jwt, { JwtPayload } from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()
import { Profile, RefreshToken, User } from '../schemas/user.schema'
import { validate } from "../utils/validateEmail";

export const register = async (req: Request, res: Response) => {
    const {username, email, password} = req.body

    if (!username || !email || !password) return res.status(400).send("Don't leave the fields blank");


    if (await User.findOne({username})) return res.status(409).send("Username already exists");


    if(!validate(email)) return res.status(400).send("Invalid Email");

    if(await User.findOne({email})) return res.status(409).send("Email already taken");


    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    try {
        const user = new User({
            username,
            email,
            password: hashedPassword
        })
        await user.save()
        res.status(201).json(user)
    } catch (err) {
        console.log('Failed to register: ' + err) 
        res.status(500).send('Failed to register')
    }
}

export const login = async (req: Request, res: Response) => {
    const {username, password} = req.body

    if (!username || !password) return res.status(400).send("Enter all fields");
    
    const user = await User.findOne({ username });

    if (!user) return res.status(404).send("Account doesn't exist. Register first")
    
    if (!user?.password) return res.status(400).send("Account error: password missing");

    const checkPassword = await bcrypt.compare(password, user.password);

    if (!checkPassword) return res.status(401).send("Wrong Password. Try again")

    const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN as string, {expiresIn: "15m"});
    const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN as string, {expiresIn: "30d"}) 

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true, 
        sameSite: "strict", 
        secure: true,
        maxAge: 30 * 24 * 60 * 60 * 1000
    })

    await RefreshToken.create({
        userId: user._id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    })

    res.status(200).json({
        RefreshToken,
        accessToken,
        user
    })
    
}

export const logout = async (req: Request, res: Response) => {
    res.clearCookie("refreshToken", {
        httpOnly: true,
        sameSite: "strict",
        secure: true
    })

    await RefreshToken.findOneAndDelete({ token: req.cookies.refreshToken})
    res.status(200).send("Logged out")
}

export const refresh = async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken
    if (!token) return res.sendStatus(403)

    const dbToken = await RefreshToken.findOne({token})
    if (!dbToken) return res.sendStatus(403)

    try {
        const payload = jwt.verify(token, process.env.REFRESH_TOKEN as string) as JwtPayload
        const newRefreshToken = jwt.sign({ id: payload.id }, process.env.REFRESH_TOKEN as string, {expiresIn: "30d"}) 
        const newAccessToken = jwt.sign({ id: payload.id }, process.env.ACCESS_TOKEN as string, {expiresIn: "15m"})

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true, 
            sameSite: "strict", 
            secure: true,
            maxAge: 30 * 24 * 60 * 60 * 1000
        })

        await RefreshToken.findOneAndUpdate({ token: token }, { token: newRefreshToken });
        res.json({accessToken: newAccessToken})
    } catch (err){
        return res.sendStatus(403)
    }
}

export const createProfile = async (req: Request, res: Response) => {
    const { displayName, bio } = req.body;
    const file = req.file
    const token = req.headers['authorization']?.split(' ')[1];
    const accessToken = process.env.ACCESS_TOKEN;

    if (!token || !accessToken) {
        return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    const decoded = jwt.verify(token, accessToken);
    const user = typeof decoded === "object" && "id" in decoded ? decoded.id : undefined;

    if (!file) return res.status(400).send("Attach a file")

        const profilePictureName = file.filename
        const profilePicturePath = file.path

    if (!displayName) return res.status(400).send("Enter a display name");

    try {
        const profile = await Profile.findOneAndUpdate(
            { user }, // find by user
            { displayName, bio, profilePictureName, profilePicturePath }, // update fields
            { new: true, upsert: true, setDefaultsOnInsert: true } // create if not exists
        );
        res.status(200).json(profile);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
};


export const getUser = async (req: Request, res: Response) => {
    const { id } = req.params; // or get from token

    try {
        // Only select public fields
        const user = await User.findById(id)
            .select('username displayName profilePicturePath profilePictureName memes followers following')
            .populate('profile') // add more public fields as needed
            .lean();

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json(user);
    } catch (err) {
        console.log("Failed to fetch user: " + err);
        res.status(500).json({ error: "Failed to fetch user" });
    }
};

export const follow = async (req: Request, res: Response) => {
    const { id } = req.params;
    const token = req.headers['authorization']?.split(' ')[1];
    const accessToken = process.env.ACCESS_TOKEN;

    if (!token || !accessToken) {
        return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    const decoded = jwt.verify(token, accessToken);
    const user = typeof decoded === "object" && "id" in decoded ? decoded.id : undefined;

    if (user === id) {
        return res.status(400).json({ error: "You cannot follow yourself." });
    }

    const followedUser = await User.findById(id).select('username').lean();
    if (!followedUser) {
        return res.status(404).json({ error: "User to follow not found." });
    }

    try {
        await User.findByIdAndUpdate(user, { $addToSet: { following: id } });
        await User.findByIdAndUpdate(id, { $addToSet: { follower: user } });

        res.status(200).json({
            message: "You followed: " + followedUser.username
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("Failed to follow user");
    }
};

export const unfollow = async (req: Request, res: Response) => {
    const { id } = req.params;
    const token = req.headers['authorization']?.split(' ')[1];
    const accessToken = process.env.ACCESS_TOKEN;

    if (!token || !accessToken) {
        return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    const decoded = jwt.verify(token, accessToken);
    const user = typeof decoded === "object" && "id" in decoded ? decoded.id : undefined;

    if (user === id) {
        return res.status(400).json({ error: "You cannot unfollow yourself." });
    }

    const unfollowedUser = await User.findById(id).select('username').lean();
    if (!unfollowedUser) {
        return res.status(404).json({ error: "User to unfollow not found." });
    }

    try {
        await User.findByIdAndUpdate(user, { $pull: { following: id } });
        await User.findByIdAndUpdate(id, { $pull: { follower: user } });

        res.status(200).json({
            message: "You unfollowed: " + unfollowedUser.username
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("Failed to unfollow user");
    }
};