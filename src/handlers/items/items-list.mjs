import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Initialize the DynamoDB Document Client for ap-southeast-2 (Sydney)
const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== LIST ITEMS BY CONTAINER INVOKED =====");
  console.log(JSON.stringify(event, null, 2));

  try {
    // 1. Extract the target container partition scope
    const containerId = event.pathParameters?.containerId;
    if (!containerId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Bad Request: Missing containerId path parameter." }),
      };
    }

    // 2. Configure a targeted Single-Table Partition Query
    const params = {
      TableName: TABLE_NAME,
      // Target the container folder and isolate records starting with the ITEM prefix
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `CONTAINER#${containerId}`,
        ":skPrefix": "ITEM#"
      }
    };

    console.log("Executing Single-Table Query Command with params:", JSON.stringify(params, null, 2));
    const response = await docClient.send(new QueryCommand(params));

    // 3. Return collection payload array back to application client
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // Prevents CORS errors during local UI development
      },
      body: JSON.stringify(response.Items || []),
    };

  } catch (error) {
    console.error("💥 LIST ITEMS EXCEPTION:", error);
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
