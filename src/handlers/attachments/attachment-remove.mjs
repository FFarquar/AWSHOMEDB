import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const REGION = "ap-southeast-2";
const ddbClient = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({ region: REGION });

const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;

export const handler = async (event) => {
  console.log("===== REMOVE ATTACHMENT HANDLER INVOKED =====");

  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
  };

  if (event.requestContext?.httpMethod === "OPTIONS" || event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: "Preflight OK" }) };
  }

  try {
    let body;
    try {
      body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (parseError) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Invalid JSON format" }) };
    }

    const { pk, sk, attachmentId } = body || {};

    if (!pk || !sk || !attachmentId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Missing required fields: pk, sk, attachmentId" })
      };
    }

    const targetKey = { PK: pk, SK: sk };

    // 1. Fetch current entity state to locate the attachment metadata
    const existingRecord = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: targetKey }));
    
    if (!existingRecord.Item) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ message: "Target entity record not found" }) };
    }

    let currentAttachments = Array.isArray(existingRecord.Item.attachments) ? existingRecord.Item.attachments : [];
    
    // Find the attachment to get its S3 file URL details before dropping it
    const targetAttachment = currentAttachments.find(att => att.attachmentId === attachmentId);
    
    if (!targetAttachment) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ message: "Attachment ID not found on this record" }) };
    }

    // 2. Extract the S3 Key from the full storage fileUrl
    // URL format: https://amazonaws.com
    let s3Key;
    try {
      const urlParts = new URL(targetAttachment.fileUrl);
      // pathname will look like "/attachments/timestamp-filename.dat" -> strip leading slash
      s3Key = decodeURIComponent(urlParts.pathname.substring(1));
    } catch (urlErr) {
      console.error("Could not parse S3 key out of fileUrl string:", targetAttachment.fileUrl);
    }

    // 3. Delete the actual binary asset file from the S3 Bucket
    if (s3Key) {
      console.log(`Deleting object from S3: ${BUCKET_NAME}/${s3Key}`);
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key
        }));
      } catch (s3Error) {
        // Log error but continue so DB entries don't get stuck out of sync if an S3 file is missing
        console.error("⚠️ S3 Object deletion failed or file was already missing:", s3Error);
      }
    }

    // 4. Filter the targeted element out of our array list map space
    const updatedAttachments = currentAttachments.filter(att => att.attachmentId !== attachmentId);

    // 5. Update the DynamoDB database row with the clean array list
    const updateParams = {
      TableName: TABLE_NAME,
      Key: targetKey,
      UpdateExpression: "SET #attachments = :updatedList",
      ExpressionAttributeNames: { "#attachments": "attachments" },
      ExpressionAttributeValues: { ":updatedList": updatedAttachments },
      ReturnValues: "UPDATED_NEW"
    };

    const response = await docClient.send(new UpdateCommand(updateParams));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Attachment removed successfully from S3 and database.",
        attachments: response.Attributes?.attachments || []
      }),
    };

  } catch (error) {
    console.error("💥 REMOVE ATTACHMENT EXCEPTION:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.name, message: error.message }),
    };
  }
};
