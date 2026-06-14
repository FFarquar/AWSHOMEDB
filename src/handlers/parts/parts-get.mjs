import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== GET PART BY ID INVOKED =====");
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

    const response = await docClient.send(new GetCommand(params));

    if (!response.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Not Found: Specified part record does not exist." }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(response.Item),
    };
  } catch (error) {
    console.error("💥 GET PART EXCEPTION:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.name, message: error.message }),
    };
  }
};
