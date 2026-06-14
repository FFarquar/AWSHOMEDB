import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});
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

    const costValue = body.cost != null ? Number(body.cost) : undefined;

    const partPayload = {
      PK: `CONTAINER#${containerId}`,
      SK: `PART#${itemId}#${partId}`,
      entityType: "PART",
      containerId,
      itemId,
      partId,
      name: body.name,
      purchaseDate: body.purchaseDate || undefined,
      cost: costValue !== undefined && !isNaN(costValue) ? costValue : undefined,
      purchasedFrom: body.purchasedFrom || undefined,
      warrantyPeriod: body.warrantyPeriod || undefined,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      createdDate: new Date().toISOString().split("T")[0],
    };

    console.log("Saving Part Payload to DynamoDB:", JSON.stringify(partPayload, null, 2));

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
