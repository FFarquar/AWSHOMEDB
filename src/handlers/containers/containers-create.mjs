import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== CONTAINERS CREATE =====");
  console.log(JSON.stringify(event, null, 2));

  // 🛠️ SECURITY CHECK: Read authorization context passed from your custom authorizer
  const authorizerContext = event.requestContext?.authorizer?.lambda || {};
  const userRole = authorizerContext.role || 'USER';

  if (userRole !== 'ADMIN') {
    console.log(`❌ SECURITY BLOCK: Unauthorized create attempt by role: ${userRole}`);
    return {
      statusCode: 403,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        message: "Forbidden: You must have an ADMIN role to create a container." 
      })
    };
  }

  try {
    const body = JSON.parse(event.body);

    const item = {
      PK: body.PK,
      SK: body.SK ?? "METADATA",
      entityType: "CONTAINER",

      containerId: body.containerId,
      name: body.name,

      photoLocation: body.photoLocation ?? "",
      purchaseDate: body.purchaseDate ?? "",
      purchasePrice: body.purchasePrice ?? 0,
      warrantyFinishDate: body.warrantyFinishDate ?? "",
      extendedWarrantyFinishDate: body.extendedWarrantyFinishDate ?? "",

      createdDate: new Date().toISOString(),
    };

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Container created",
      }),
    };

  } catch (err) {
    console.error(err);

    // Differentiate a conditional check failure (container already exists) from generic errors
    const statusCode = err.name === "ConditionalCheckFailedException" ? 409 : 500;

    return {
      statusCode: statusCode,
      body: JSON.stringify({
        message: err.message,
      }),
    };
  }
};
