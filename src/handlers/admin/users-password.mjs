import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from 'bcryptjs';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
    console.log("===== ADMIN USERS PASSWORD =====");

    const authContext = event.requestContext?.authorizer || {};
    if (authContext.role !== 'ADMIN') {
        return {
            statusCode: 403,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Forbidden: ADMIN role required." })
        };
    }

    try {
        const loginID = event.pathParameters?.loginID;
        if (!loginID) {
            return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "loginID path parameter is required." }) };
        }

        const body = JSON.parse(event.body || '{}');
        const { password } = body;

        if (!password || password.length < 6) {
            return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "Password must be at least 6 characters." }) };
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await ddb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `USER#${loginID}`, SK: 'PROFILE' },
            UpdateExpression: 'SET passwordHash = :hash',
            ExpressionAttributeValues: { ':hash': passwordHash },
            ConditionExpression: 'attribute_exists(PK)'
        }));

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Password updated successfully." })
        };
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "User not found." }) };
        }
        console.error(err);
        return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: err.message }) };
    }
};
