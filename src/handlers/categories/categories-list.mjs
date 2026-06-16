import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== LIST CATEGORIES INVOKED =====");

  try {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: "begins_with(SK, :skPrefix) AND attribute_exists(#cat)",
      ExpressionAttributeNames: { "#cat": "category" },
      ExpressionAttributeValues: { ":skPrefix": "ITEM#" },
      ProjectionExpression: "#cat"
    };

    const response = await docClient.send(new ScanCommand(params));

    const categories = [...new Set(
      (response.Items || [])
        .map(item => item.category)
        .filter(c => c && c.trim())
    )].sort();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(categories)
    };

  } catch (error) {
    console.error("💥 LIST CATEGORIES EXCEPTION:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: error.name, message: error.message })
    };
  }
};
