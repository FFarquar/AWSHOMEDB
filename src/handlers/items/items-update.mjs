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
    
    // Extracting the clean, flat fields directly matching your Postman payload
    const {
      itemName,
      category,
      purchasedFrom,
      warrantyExpiryDate,
      purchaseDate,
      purchasePrice,
      physicalPaperStorageLocation,
      attachments
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
    if (category !== undefined) {
      updateExpression += " #cat = :cat,";
      expressionAttributeNames["#cat"] = "category";        
      expressionAttributeValues[":cat"] = category;
    }
    if (purchasedFrom !== undefined) {
      updateExpression += " #pf = :pf,";
      expressionAttributeNames["#pf"] = "purchasedFrom";    
      expressionAttributeValues[":pf"] = purchasedFrom;
    }
    if (warrantyExpiryDate !== undefined) {
      updateExpression += " #wed = :wed,";
      expressionAttributeNames["#wed"] = "warrantyExpiryDate"; 
      expressionAttributeValues[":wed"] = warrantyExpiryDate;
    }
    if (purchaseDate !== undefined) {
      updateExpression += " #pd = :pd,";
      expressionAttributeNames["#pd"] = "purchaseDate";
      expressionAttributeValues[":pd"] = purchaseDate;
    }
    if (purchasePrice !== undefined) {
      updateExpression += " #pp = :pp,";
      expressionAttributeNames["#pp"] = "purchasePrice";
      expressionAttributeValues[":pp"] = Number(purchasePrice) || 0;
    }
    if (physicalPaperStorageLocation !== undefined) {
      updateExpression += " #sl = :sl,";
      expressionAttributeNames["#sl"] = "physicalPaperStorageLocation";
      expressionAttributeValues[":sl"] = physicalPaperStorageLocation;
    }
    if (attachments !== undefined) {
      updateExpression += " #at = :at,";
      expressionAttributeNames["#at"] = "attachments";
      expressionAttributeValues[":at"] = attachments;
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