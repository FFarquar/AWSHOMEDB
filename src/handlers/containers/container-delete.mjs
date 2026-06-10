import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== DELETE CONTAINER INVOKED =====");
  console.log(JSON.stringify(event, null, 2));

  try {
    // 🚀 Extract the container identifier from the URL path parameter
    const containerId = event.pathParameters.id;

    if (!containerId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing required container ID path parameter." }),
      };
    }

    // 🚀 Construct the exact Partition Key and Sort Key matching your DB design
    // Adjust 'CONTAINER#...' or '#METADATA' if your key naming convention differs
    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `CONTAINER#${containerId}`,
        SK: "METADATA" 
      },
    };

    console.log("Executing DynamoDB Delete against:", params.Key);
    await docClient.send(new DeleteCommand(params));

    console.log("✅ DELETE SUCCESSFUL");
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Handles potential CORS needs
      },
      body: JSON.stringify({ 
        message: `Container ${containerId} successfully deleted.`,
        id: containerId 
      }),
    };

  } catch (error) {
    console.error("💥 DELETE EXCEPTION CAUGHT:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal Server Error", message: error.message }),
    };
  }
};
