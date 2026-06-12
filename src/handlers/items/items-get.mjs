import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

// Initialize the DynamoDB Document Client for ap-southeast-2 (Sydney)
const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== GET ITEM BY ID INVOKED =====");
  console.log(JSON.stringify(event, null, 2));

  try {
    // 1. Extract composite keys from URL path variables
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

    // 2. Point directly to the explicit record identity partition
    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `CONTAINER#${containerId}`,
        SK: `ITEM#${itemId}`
      }
    };

    console.log("Executing DynamoDB Get Command on target keys:", params.Key);
    const response = await docClient.send(new GetCommand(params));

    // 3. Handle data presence validation checks
    if (!response.Item) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Not Found: Specified item record does not exist." }),
      };
    }

    // 4. Return item record map object to client application
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // Keeps local client website cross-origin connections unblocked
      },
      body: JSON.stringify(response.Item),
    };

  } catch (error) {
    console.error("💥 GET ITEM EXCEPTION:", error);
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
