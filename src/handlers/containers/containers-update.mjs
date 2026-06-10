import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== UPDATE CONTAINER INVOKED =====");
  console.log(JSON.stringify(event, null, 2));

  try {
    const containerId = event.pathParameters?.id;
    if (!containerId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing required container ID path parameter." }),
      };
    }

    // Parse the payload body sent from Postman
    const body = JSON.parse(event.body || "{}");
    const { itemName, category, purchasedFrom } = body;

    // Check that at least one update attribute is provided
    if (!itemName && !category && !purchasedFrom) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No update fields provided. Supply at least itemName, category, or purchasedFrom." }),
      };
    }

    // Dynamically build the Update Expression to update only what is provided
    let updateExpression = "SET";
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (itemName) {
      updateExpression += " #itemName = :itemName,";
      expressionAttributeNames["#itemName"] = "itemName";
      expressionAttributeValues[":itemName"] = itemName;
    }
    if (category) {
      updateExpression += " #category = :category,";
      expressionAttributeNames["#category"] = "category";
      expressionAttributeValues[":category"] = category;
    }
    if (purchasedFrom) {
      updateExpression += " #purchasedFrom = :purchasedFrom,";
      expressionAttributeNames["#purchasedFrom"] = "purchasedFrom";
      expressionAttributeValues[":purchasedFrom"] = purchasedFrom;
    }

    // Remove the trailing comma from the expression string
    updateExpression = updateExpression.slice(0, -1);

    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `CONTAINER#${containerId}`,
        SK: `CONTAINER#${containerId}` // Uses the same mirrored pattern that worked for your DELETE
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW" // 🚀 Forces DynamoDB to return the complete updated object
    };

    console.log("Executing DynamoDB Update Command...");
    const response = await docClient.send(new UpdateCommand(params));

    console.log("✅ UPDATE SUCCESSFUL");
    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify({
        message: `Container ${containerId} updated successfully.`,
        updatedAttributes: response.Attributes
      }),
    };

  } catch (error) {
    console.error("💥 UPDATE EXCEPTION CAUGHT:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.name, message: error.message }),
    };
  }
};
