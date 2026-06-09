import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
  PutCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  try {

    const method = event.httpMethod;
    const id = event.pathParameters?.id;

    // -------------------------
    // POST /containers
    // -------------------------
    if (method === "POST") {
      return await createContainer(event);
    }

    // -------------------------
    // GET /containers/{id}
    // -------------------------
    if (method === "GET" && id) {
      const result = await ddb.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND SK = :sk",
          ExpressionAttributeValues: {
            ":pk": `CONTAINER#${id}`,
            ":sk": "METADATA",
          },
        })
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.Items?.[0] || null),
      };
    }

    // -------------------------
    // GET /containers
    // -------------------------
    if (method === "GET") {
      const result = await ddb.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "begins_with(PK, :prefix)",
          ExpressionAttributeValues: {
            ":prefix": "CONTAINER#",
          },
        })
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.Items || []),
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({
        message: "Method not allowed",
      }),
    };

  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: err.message,
      }),
    };
  }
};

async function createContainer(event) {
s
  const body = JSON.parse(event.body);

  if (!body.id || !body.containerName) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing details needed",
      }),
    };
  }

  const item = {
    PK: `CONTAINER#${body.id}`,
    SK: "METADATA",
    entityType: "CONTAINER",

    containerID: body.containerID,
    description: body.description ?? "",
    location: body.location ?? "",
    extendedWarrantyFinishDate: body.extendedWarrantyFinishDate ?? "",
    purchaseDate: body.purchaseDate ?? "",
    purchasePrice: body.purchasePrice ?? "",
    warrantyFinishDate: body.warrantyFinishDate ?? "",
    photoLocation: body.photoLocation ?? "",
    name: body.name,


    createdDate: new Date().toISOString(),
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,

      // Prevent overwriting an existing container
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );

  return {
    statusCode: 201,
    body: JSON.stringify({
      message: "Container created",
      id: body.id,
    }),
  };
}