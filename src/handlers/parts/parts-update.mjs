import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== UPDATE PART INVOKED =====");
  console.log(JSON.stringify(event, null, 2));

  try {
    const { containerId, itemId, partId } = event.pathParameters || {};
    if (!containerId || !itemId || !partId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Bad Request: Missing required path parameters." }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { name, purchaseDate, cost, purchasedFrom, warrantyPeriod, attachments } = body;

    let updateExpression = "SET";
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (name !== undefined) {
      updateExpression += " #nm = :nm,";
      expressionAttributeNames["#nm"] = "name";
      expressionAttributeValues[":nm"] = name;
    }
    if (purchaseDate !== undefined) {
      updateExpression += " #pd = :pd,";
      expressionAttributeNames["#pd"] = "purchaseDate";
      expressionAttributeValues[":pd"] = purchaseDate;
    }
    if (cost !== undefined) {
      updateExpression += " #ct = :ct,";
      expressionAttributeNames["#ct"] = "cost";
      expressionAttributeValues[":ct"] = Number(cost);
    }
    if (purchasedFrom !== undefined) {
      updateExpression += " #pf = :pf,";
      expressionAttributeNames["#pf"] = "purchasedFrom";
      expressionAttributeValues[":pf"] = purchasedFrom;
    }
    if (warrantyPeriod !== undefined) {
      updateExpression += " #wp = :wp,";
      expressionAttributeNames["#wp"] = "warrantyPeriod";
      expressionAttributeValues[":wp"] = warrantyPeriod;
    }
    if (attachments !== undefined) {
      updateExpression += " #at = :at,";
      expressionAttributeNames["#at"] = "attachments";
      expressionAttributeValues[":at"] = attachments;
    }

    if (updateExpression === "SET") {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "No valid parameters provided." }),
      };
    }

    updateExpression = updateExpression.slice(0, -1);

    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `CONTAINER#${containerId}`,
        SK: `PART#${itemId}#${partId}`,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };

    const response = await docClient.send(new UpdateCommand(params));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        message: `Part ${partId} updated successfully.`,
        updatedAttributes: response.Attributes,
      }),
    };
  } catch (error) {
    console.error("💥 UPDATE PART EXCEPTION:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.name, message: error.message }),
    };
  }
};
