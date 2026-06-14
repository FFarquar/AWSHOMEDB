import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== DELETE PART INVOKED =====");
  console.log(JSON.stringify(event, null, 2));

  try {
    const { containerId, itemId, partId } = event.pathParameters || {};
    if (!containerId || !itemId || !partId) {
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
        SK: `PART#${itemId}#${partId}`,
      },
    };

    await docClient.send(new DeleteCommand(params));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: `Part ${partId} deleted successfully from item ${itemId}.` }),
    };
  } catch (error) {
    console.error("💥 DELETE PART EXCEPTION:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.name, message: error.message }),
    };
  }
};
