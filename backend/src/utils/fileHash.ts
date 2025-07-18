import fs from 'fs'
import crypto from 'crypto'

export function getFileHash(filePath: any) {
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256'); // or 'md5'
    hash.update(fileBuffer);
    return hash.digest('hex');
}