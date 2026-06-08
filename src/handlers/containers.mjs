import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  try {
    const id = event.pathParameters?.id;

    // -------------------------
    // GET /containers/{id}
    // -------------------------
    if (id) {
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

  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to fetch containers",
        error: err.message,
      }),
    };
  }
};