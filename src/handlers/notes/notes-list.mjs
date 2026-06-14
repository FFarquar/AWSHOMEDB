import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== LIST NOTES BY ITEM INVOKED =====");
  console.log(JSON.stringify(event, null, 2));

  try {
    const { containerId, itemId } = event.pathParameters || {};
    if (!containerId || !itemId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Bad Request: Missing containerId or itemId path parameters." }),
      };
    }

    // Notes are stored under the container partition with SK prefix NOTE#<itemId>#
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `CONTAINER#${containerId}`,
        ":skPrefix": `NOTE#${itemId}#`,
      },
    };

    console.log("Executing Query Command with params:", JSON.stringify(params, null, 2));
    const response = await docClient.send(new QueryCommand(params));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(response.Items || []),
    };
  } catch (error) {
    console.error("💥 LIST NOTES EXCEPTION:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.name, message: error.message }),
    };
  }
};
