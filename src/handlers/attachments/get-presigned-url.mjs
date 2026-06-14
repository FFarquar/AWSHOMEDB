import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET_NAME = process.env.BUCKET_NAME;
const REGION = "ap-southeast-2";

// 🚀 Performance Optimization: Instantiated outside the handler to reuse TCP connections
const s3 = new S3Client({ region: REGION });

export const handler = async (event) => {
  console.log("=== INBOUND AWS APIGW EVENT WORKSPACE ===", JSON.stringify(event));

  // Balanced headers matching your environment's HttpApi conventions
  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
  };

  // Handle CORS preflight check safely if hit directly
  if (event.requestContext?.http?.method === "OPTIONS" || event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Preflight OK" }),
    };
  }

  try {
    const queryParams = event.queryStringParameters || {};
    const filename = queryParams.filename || `asset-${Date.now()}.dat`;
    const contentType = queryParams.contentType || "application/octet-stream";
    
    // Clean filename string spaces to prevent path splitting bugs
    const safeFilename = encodeURIComponent(filename.replace(/\s+/g, "-"));
    const s3Key = `attachments/${Date.now()}-${safeFilename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    
    // ✨ FIX: Resolved string literal interpolation formatting typo cleanly
    const fileUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${s3Key}`;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        uploadUrl,
        fileUrl
      }),
    };

  } catch (err) {
    console.error("❌ CRITICAL UNHANDLED INNER FUNCTION CRASH:", err.stack);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: "Internal token build engine processing crash error.",
        error: err.message
      }),
    };
  }
};
