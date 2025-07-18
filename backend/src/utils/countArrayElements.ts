import { MongoClient } from 'mongodb';
import dotenv from 'dotenv'
dotenv.config()
const uri = process.env.MONGO_URL!;
const client = new MongoClient(uri);

async function countArrayElements(collectionName: string, documentId: string, arrayField: string) {
    const database = client.db('your_database_name');
    const collection = database.collection(collectionName);
    const result = await collection.aggregate([
        { $match: { _id: documentId } },
        { $project: { count: { $size: `$${arrayField}` } } }
    ]).toArray();
    return result.length > 0 ? result[0].count : 0;
}