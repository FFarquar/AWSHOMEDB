import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET_NAME = process.env.BUCKET_NAME;
const REGION = "ap-southeast-2";

const s3 = new S3Client({ region: REGION });

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization"
};

export const handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS" || event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: "Preflight OK" }) };
  }

  try {
    const key = event.queryStringParameters?.key;
    if (!key) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ message: "Missing key parameter" }) };
    }

    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ downloadUrl })
    };
  } catch (err) {
    console.error("get-download-url error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: err.message })
    };
  }
};
