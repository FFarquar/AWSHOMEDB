import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
    console.log("===== ADMIN USERS LIST =====");

    const authContext = event.requestContext?.authorizer || {};
    if (authContext.role !== 'ADMIN') {
        return {
            statusCode: 403,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Forbidden: ADMIN role required." })
        };
    }

    try {
        const result = await ddb.send(new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'entityType = :et',
            ExpressionAttributeValues: { ':et': 'USER' }
        }));

        const users = (result.Items || []).map(u => ({
            loginID: u.loginID,
            role: u.role,
            active: u.active
        }));

        users.sort((a, b) => a.loginID.localeCompare(b.loginID));

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(users)
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: err.message })
        };
    }
};
