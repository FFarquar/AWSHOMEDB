import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== CREATE NOTE INVOKED =====");
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

    const body = JSON.parse(event.body || "{}");

    if (!body.description) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Validation Error: description is a required field." }),
      };
    }

    const noteId = "NOTE" + Date.now();

    const notePayload = {
      PK: `CONTAINER#${containerId}`,
      SK: `NOTE#${itemId}#${noteId}`,
      entityType: "NOTE",
      containerId,
      itemId,
      noteId,
      description: body.description,
      date: body.date || new Date().toISOString().split("T")[0],
      attachments: body.attachments || [],
      createdDate: new Date().toISOString().split("T")[0],
    };

    console.log("Saving Note Payload to DynamoDB:", JSON.stringify(notePayload, null, 2));

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: notePayload }));

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Note created successfully.", note: notePayload }),
    };
  } catch (error) {
    console.error("💥 CREATE NOTE EXCEPTION:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.name, message: error.message }),
    };
  }
};
