import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from 'bcryptjs';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

const VALID_ROLES = ['ADMIN', 'USER', 'GUEST'];

export const handler = async (event) => {
    console.log("===== ADMIN USERS CREATE =====");

    const authContext = event.requestContext?.authorizer?.lambda || {};
    if (authContext.role !== 'ADMIN') {
        return {
            statusCode: 403,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Forbidden: ADMIN role required." })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { loginID, password, role, active } = body;

        if (!loginID || !loginID.trim()) {
            return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "loginID is required." }) };
        }
        if (!password || password.length < 6) {
            return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "Password must be at least 6 characters." }) };
        }
        if (role && !VALID_ROLES.includes(role)) {
            return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "Invalid role. Must be ADMIN, USER, or GUEST." }) };
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await ddb.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: `USER#${loginID.trim()}`,
                SK: 'PROFILE',
                entityType: 'USER',
                loginID: loginID.trim(),
                role: role || 'USER',
                active: active !== false,
                passwordHash,
                createdDate: new Date().toISOString()
            },
            ConditionExpression: 'attribute_not_exists(PK)'
        }));

        return {
            statusCode: 201,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "User created successfully." })
        };
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return { statusCode: 409, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "A user with this loginID already exists." }) };
        }
        console.error(err);
        return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: err.message }) };
    }
};
