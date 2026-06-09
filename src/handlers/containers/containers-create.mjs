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

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: err.message,
      }),
    };
  }
};