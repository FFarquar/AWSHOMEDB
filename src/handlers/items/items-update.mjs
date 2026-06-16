import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  try {
    const { containerId, itemId } = event.pathParameters || {};
    if (!containerId || !itemId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing path variables" }) };
    }

    const body = JSON.parse(event.body || "{}");

    // Accept the same prefixed field names the frontend sends (matching items-create convention)
    const {
      itemName,
      itemCategory,
      itempurchasedFrom,
      itemwarrantyPeriod,
      itempurchaseDate,
      itempurchasePrice,
      itemphysicalPaperStorageLocation,
      itemAttachments
    } = body;

    let updateExpression = "SET";
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (itemName !== undefined) {
      updateExpression += " #name = :name, #itemName = :itemName,";
      expressionAttributeNames["#name"] = "name";
      expressionAttributeNames["#itemName"] = "itemName";
      expressionAttributeValues[":name"] = itemName;
      expressionAttributeValues[":itemName"] = itemName;
    }
    if (itemCategory !== undefined) {
      updateExpression += " #cat = :cat,";
      expressionAttributeNames["#cat"] = "category";
      expressionAttributeValues[":cat"] = itemCategory;
    }
    if (itempurchasedFrom !== undefined) {
      updateExpression += " #pf = :pf,";
      expressionAttributeNames["#pf"] = "purchasedFrom";
      expressionAttributeValues[":pf"] = itempurchasedFrom;
    }
    if (itemwarrantyPeriod !== undefined) {
      updateExpression += " #wed = :wed,";
      expressionAttributeNames["#wed"] = "warrantyExpiryDate";
      expressionAttributeValues[":wed"] = itemwarrantyPeriod;
    }
    if (itempurchaseDate !== undefined) {
      updateExpression += " #pd = :pd,";
      expressionAttributeNames["#pd"] = "purchaseDate";
      expressionAttributeValues[":pd"] = itempurchaseDate;
    }
    if (itempurchasePrice !== undefined) {
      updateExpression += " #pp = :pp,";
      expressionAttributeNames["#pp"] = "purchasePrice";
      expressionAttributeValues[":pp"] = Number(itempurchasePrice) || 0;
    }
    if (itemphysicalPaperStorageLocation !== undefined) {
      updateExpression += " #sl = :sl,";
      expressionAttributeNames["#sl"] = "physicalPaperStorageLocation";
      expressionAttributeValues[":sl"] = itemphysicalPaperStorageLocation;
    }
    if (itemAttachments !== undefined) {
      updateExpression += " #at = :at,";
      expressionAttributeNames["#at"] = "attachments";
      expressionAttributeValues[":at"] = itemAttachments;
    }

    if (updateExpression === "SET") {
      return { statusCode: 400, body: JSON.stringify({ error: "No valid parameters provided." }) };
    }

    updateExpression = updateExpression.slice(0, -1);

    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `CONTAINER#${containerId}`,
        SK: `ITEM#${itemId}`
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW" 
    };

    const response = await docClient.send(new UpdateCommand(params));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        message: `Item ${itemId} updated successfully.`,
        updatedAttributes: response.Attributes
      }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};