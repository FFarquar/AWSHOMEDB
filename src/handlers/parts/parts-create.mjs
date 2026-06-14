import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== CREATE PART INVOKED =====");
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

    if (!body.name) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Validation Error: name is a required field." }),
      };
    }

    const partId = "PART" + Date.now();

    const partPayload = {
      PK: `CONTAINER#${containerId}`,
      SK: `PART#${itemId}#${partId}`,
      entityType: "PART",
      containerId,
      itemId,
      partId,
      name: body.name,
      purchaseDate: body.purchaseDate || null,
      cost: body.cost !== undefined ? Number(body.cost) : null,
      purchasedFrom: body.purchasedFrom || null,
      warrantyPeriod: body.warrantyPeriod || null,
      attachments: body.attachments || [],
      createdDate: new Date().toISOString().split("T")[0],
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: partPayload }));

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Part created successfully.", part: partPayload }),
    };
  } catch (error) {
    console.error("💥 CREATE PART EXCEPTION:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.name, message: error.message }),
    };
  }
};
