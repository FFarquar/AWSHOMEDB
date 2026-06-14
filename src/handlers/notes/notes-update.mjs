import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== UPDATE NOTE INVOKED =====");
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

    const body = JSON.parse(event.body || "{}");
    const { description, date, attachments } = body;

    let updateExpression = "SET";
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (description !== undefined) {
      updateExpression += " #desc = :desc,";
      expressionAttributeNames["#desc"] = "description";
      expressionAttributeValues[":desc"] = description;
    }
    if (date !== undefined) {
      updateExpression += " #dt = :dt,";
      expressionAttributeNames["#dt"] = "date";
      expressionAttributeValues[":dt"] = date;
    }
    if (attachments !== undefined) {
      updateExpression += " #at = :at,";
      expressionAttributeNames["#at"] = "attachments";
      expressionAttributeValues[":at"] = attachments;
    }

    if (updateExpression === "SET") {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "No valid parameters provided." }),
      };
    }

    updateExpression = updateExpression.slice(0, -1);

    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `CONTAINER#${containerId}`,
        SK: `NOTE#${itemId}#${noteId}`,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };

    const response = await docClient.send(new UpdateCommand(params));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        message: `Note ${noteId} updated successfully.`,
        updatedAttributes: response.Attributes,
      }),
    };
  } catch (error) {
    console.error("💥 UPDATE NOTE EXCEPTION:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.name, message: error.message }),
    };
  }
};
