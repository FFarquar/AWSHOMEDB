import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME;

export const handler = async (event) => {
  try {
    const filename = event.queryStringParameters?.filename || `file-${Date.now()}`;
    const contentType = event.queryStringParameters?.contentType || "application/octet-stream";
    
    // Generate a uniquely timestamped key path in S3
    const s3Key = `attachments/${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
    });

    // Link stays active for 5 minutes (300 seconds)
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadUrl,
        fileUrl: `https://${BUCKET_NAME}://{s3Key}`
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message }),
    };
  }
};