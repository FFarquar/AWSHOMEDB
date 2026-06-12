import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

// Initialize the DynamoDB Document Client for ap-southeast-2 (Sydney)
const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== DELETE ITEM INVOKED =====");
  console.log(JSON.stringify(event, null, 2));

  try {
    // 1. Extract identity parameters from the nested route path
    const { containerId, itemId } = event.pathParameters || {};

    if (!containerId || !itemId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Bad Request: Missing required containerId or itemId path parameters." }),
      };
    }

    // 2. Map structural values to target the exact item row
    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `CONTAINER#${containerId}`, // Targets the parent container bucket folder
        SK: `ITEM#${itemId}`           // Targets the specific item record ID
      }
    };

    console.log("Executing DynamoDB Delete Command on target keys:", params.Key);

    // 3. Purge the target item row from the database table
    await docClient.send(new DeleteCommand(params));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // Allows error-free local frontend UI tracking execution
      },
      body: JSON.stringify({ 
        message: `Item ${itemId} successfully purged from container ${containerId}.` 
      }),
    };

  } catch (error) {
    console.error("💥 DELETE ITEM EXCEPTION:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: error.name, message: error.message }),
    };
  }
};
