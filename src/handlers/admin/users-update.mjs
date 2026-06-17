import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

const VALID_ROLES = ['ADMIN', 'USER', 'GUEST'];

export const handler = async (event) => {
    console.log("===== ADMIN USERS UPDATE =====");

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
        const { role, active } = body;

        if (role && !VALID_ROLES.includes(role)) {
            return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "Invalid role. Must be ADMIN, USER, or GUEST." }) };
        }

        await ddb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `USER#${loginID}`, SK: 'PROFILE' },
            UpdateExpression: 'SET #role = :role, active = :active',
            ExpressionAttributeNames: { '#role': 'role' },
            ExpressionAttributeValues: {
                ':role': role || 'USER',
                ':active': active !== false
            },
            ConditionExpression: 'attribute_exists(PK)'
        }));

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "User updated successfully." })
        };
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "User not found." }) };
        }
        console.error(err);
        return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: err.message }) };
    }
};
