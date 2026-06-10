import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== UNIVERSAL DELETE INVOKED =====");
  
  try {
    const containerId = event.pathParameters?.id;
    if (!containerId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing required container ID parameter." }),
      };
    }

    const targetPK = `CONTAINER#${containerId}`;

    // 🚀 Attempt 1: Try deleting using the mirrored key pattern (Like CONTAINER4 uses)
    try {
      console.log(`Attempting deletion with mirrored SK: ${targetPK}`);
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { PK: targetPK, SK: targetPK },
        ConditionExpression: "attribute_exists(PK)"
      }));
      
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Container ${containerId} successfully removed.`, id: containerId })
      };
    } catch (innerError) {
      // If it failed because the key pattern didn't match, fall through to Attempt 2
      if (innerError.name !== "ConditionalCheckFailedException") {
        throw innerError;
      }
    }

    // 🚀 Attempt 2: Try deleting using the legacy METADATA pattern (Like CONTAINER1, 2, 3 use)
    console.log(`Mirrored SK not found. Attempting deletion with SK: METADATA`);
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: targetPK, SK: "METADATA" },
      ConditionExpression: "attribute_exists(PK)"
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `Container ${containerId} successfully removed.`, id: containerId })
    };

  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "NotFound", message: "Container does not exist." }),
      };
    }

    console.error("💥 SYSTEM EXCEPTION:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.name, message: error.message }),
    };
  }
};
