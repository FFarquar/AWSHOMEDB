import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== ADD ATTACHMENT TO ITEM INVOKED =====");

  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
  };

  // Handle HttpApi CORS Preflight if necessary
  if (event.requestContext?.http?.method === "OPTIONS" || event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: "Preflight OK" }) };
  }

  try {
    let body;
    try {
      body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (parseError) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Invalid JSON format" }) };
    }

    const { pk, sk, filename, fileUrl } = body || {};

    if (!pk || !sk || !filename || !fileUrl) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Missing required fields: pk, sk, filename, fileUrl" })
      };
    }

    const targetKey = { PK: pk, SK: sk };

    // 1. Fetch current item state to check data type safely
    const existingItem = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: targetKey }));
    
    if (!existingItem.Item) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ message: "Item not found" }) };
    }

    // 2. Safely parse or extract existing attachments array
    let currentAttachments = [];
    const rawAttachments = existingItem.Item.attachments;

    if (Array.isArray(rawAttachments)) {
      currentAttachments = rawAttachments;
    } else if (typeof rawAttachments === "string" && rawAttachments.trim() !== "") {
      try {
        const parsed = JSON.parse(rawAttachments);
        if (Array.isArray(parsed)) currentAttachments = parsed;
      } catch (e) {
        console.warn("⚠️ Attachments attribute was an unparseable string. Resetting to empty array.");
      }
    }

    // 3. Construct the new attachment object
    const newAttachment = {
      attachmentId: `att-${Date.now()}`,
      filename,
      fileUrl,
      uploadedAt: new Date().toISOString()
    };

    // 4. Push the item and save back cleanly as a native DynamoDB List type
    currentAttachments.push(newAttachment);

    const updateParams = {
      TableName: TABLE_NAME,
      Key: targetKey,
      UpdateExpression: "SET #attachments = :updatedList",
      ExpressionAttributeNames: { "#attachments": "attachments" },
      ExpressionAttributeValues: { ":updatedList": currentAttachments },
      ReturnValues: "UPDATED_NEW"
    };

    const response = await docClient.send(new UpdateCommand(updateParams));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Attachment saved successfully.",
        attachments: response.Attributes?.attachments
      }),
    };

  } catch (error) {
    console.error("💥 ADD ATTACHMENT EXCEPTION:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.name, message: error.message }),
    };
  }
};
