import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
    console.log("===== UPDATE UPLOAD SETTINGS =====");

    const authContext = event.requestContext?.authorizer?.lambda || {};
    if (authContext.role !== 'ADMIN') {
        return {
            statusCode: 403,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Forbidden: ADMIN role required." })
        };
    }

    try {
        const body = JSON.parse(event.body || "{}");
        const pdfSizeLimitMB = Number(body.pdfSizeLimitMB);
        const imageCompressionEnabled = body.imageCompressionEnabled === true || body.imageCompressionEnabled === "true";

        if (!Number.isFinite(pdfSizeLimitMB) || pdfSizeLimitMB <= 0) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "pdfSizeLimitMB must be a positive number." })
            };
        }

        await ddb.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: "SYSTEM#SETTINGS",
                SK: "SETTINGS",
                entityType: "SETTINGS",
                pdfSizeLimitMB,
                imageCompressionEnabled
            }
        }));

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdfSizeLimitMB, imageCompressionEnabled })
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
