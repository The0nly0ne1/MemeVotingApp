import { NextFunction, Request, Response } from "express";
import jwt, {JwtPayload} from 'jsonwebtoken'


declare module 'express-serve-static-core' {
    interface Request {
      user?: JwtPayload;
    }
}

export const validate = (req: Request, res: Response, next: NextFunction) => {
    // Correct extraction: split(' ')[1] gets the token after 'Bearer'
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(403);

    jwt.verify(token, process.env.ACCESS_TOKEN!, (err, decoded) => {
        if (err) return res.sendStatus(403);

        if (decoded && typeof decoded === "object") {
            req.user = decoded as JwtPayload;
        }
        next();
    });
}