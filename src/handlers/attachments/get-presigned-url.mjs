import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET_NAME = process.env.BUCKET_NAME;

export const handler = async (event) => {
  console.log("=== INBOUND AWS APIGW EVENT WORKSPACE ===", JSON.stringify(event));

  try {
    const s3 = new S3Client({ region: "ap-southeast-2" });

    const queryParams = event.queryStringParameters || {};
    const filename = queryParams.filename || `asset-${Date.now()}.dat`;
    const contentType = queryParams.contentType || "application/octet-stream";
    
    const s3Key = `attachments/${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://github.io",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
      },
      body: JSON.stringify({
        uploadUrl,
        fileUrl: `https://${BUCKET_NAME}://{s3Key}`
      }),
    };

  } catch (err) {
    console.error("❌ CRITICAL UNHANDLED INNER FUNCTION CRASH:", err.stack);
    
    return {
      statusCode: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://github.io" 
      },
      body: JSON.stringify({ 
        message: "Internal token build engine processing crash error.",
        error: err.message
      }),
    };
  }
};