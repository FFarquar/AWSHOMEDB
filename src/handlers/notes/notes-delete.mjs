import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== DELETE NOTE INVOKED =====");
  console.log(JSON.stringify(event, null, 2));

  try {
    const { containerId, itemId, noteId } = event.pathParameters || {};
    if (!containerId || !itemId || !noteId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Bad Request: Missing required path parameters." }),
      };
    }

    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `CONTAINER#${containerId}`,
        SK: `NOTE#${itemId}#${noteId}`,
      },
    };

    console.log("Executing DynamoDB Delete Command on target keys:", params.Key);
    await docClient.send(new DeleteCommand(params));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: `Note ${noteId} deleted successfully from item ${itemId}.` }),
    };
  } catch (error) {
    console.error("💥 DELETE NOTE EXCEPTION:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.name, message: error.message }),
    };
  }
};
