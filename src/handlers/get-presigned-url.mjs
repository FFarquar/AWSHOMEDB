import { createRequire } from "module";
import path from "path";

// 🚀 FORCE NODE TO RESOLVE DEPENDENCIES OUT OF YOUR ROOT SAM DEPLOYMENT PACKAGE
const require = createRequire(import.meta.url);
const rootPath = path.resolve(".");

const { S3Client, PutObjectCommand } = require(path.join(rootPath, "node_modules/@aws-sdk/client-s3"));
const { getSignedUrl } = require(path.join(rootPath, "node_modules/@aws-sdk/s3-request-presigner"));

const BUCKET_NAME = process.env.BUCKET_NAME;

export const handler = async (event) => {
  console.log("=== INBOUND AWS APIGW EVENT WORKSPACE ===", JSON.stringify(event));

  try {
    const s3 = new S3Client({ region: "ap-southeast-2" });

    // Fallback dictionary checks to capture both 1.0 and 2.0 payload mapping versions
    const queryParams = event.queryStringParameters || {};
    const filename = queryParams.filename || `asset-${Date.now()}.dat`;
    const contentType = queryParams.contentType || "application/octet-stream";
    
    const s3Key = `attachments/${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
    });

    // Generate secure upload path link
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