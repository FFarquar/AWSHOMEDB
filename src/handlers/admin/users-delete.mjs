import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
    console.log("===== ADMIN USERS DELETE =====");

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

        if (authContext.loginID === loginID) {
            return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "You cannot delete your own account." }) };
        }

        await ddb.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { PK: `USER#${loginID}`, SK: 'PROFILE' },
            ConditionExpression: 'attribute_exists(PK)'
        }));

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "User deleted successfully." })
        };
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "User not found." }) };
        }
        console.error(err);
        return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: err.message }) };
    }
};
