import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

const DEFAULTS = { pdfSizeLimitMB: 5, imageCompressionEnabled: true, showContainerButtons: true };

export const handler = async (event) => {
    console.log("===== GET UPLOAD SETTINGS =====");

    try {
        const result = await ddb.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: "SYSTEM#SETTINGS", SK: "SETTINGS" }
        }));

        const item = result.Item || {};
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                pdfSizeLimitMB: item.pdfSizeLimitMB ?? DEFAULTS.pdfSizeLimitMB,
                imageCompressionEnabled: item.imageCompressionEnabled ?? DEFAULTS.imageCompressionEnabled,
                showContainerButtons: item.showContainerButtons ?? DEFAULTS.showContainerButtons
            })
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
