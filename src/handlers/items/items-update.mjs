import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// Initialize the DynamoDB Document Client for ap-southeast-2 (Sydney)
const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== UPDATE ITEM INVOKED =====");
  console.log(JSON.stringify(event, null, 2));

  try {
    // 1. Extract composite identity path constraints from path parameters
    const { containerId, itemId } = event.pathParameters || {};
    if (!containerId || !itemId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Bad Request: Missing required path variables." }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    
    // Extract the raw payload body parameters
    const {
      itemName,
      itemCategory,
      itempurchasedFrom,
      itemwarrantyPeriod,
      itemextendedWarrantyPeriod,
      itempurchaseDate,
      itempurchasePrice,
      itemphysicalPaperStorageLocation,
      itemAttachments
    } = body;

    // Dynamically build the Update Expression block components
    let updateExpression = "SET";
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    // 2. Map standard fields and sync required table GSIs safely
    if (itemName !== undefined) {
      updateExpression += " #name = :name, #gsiName = :gsiName,";
      expressionAttributeNames["#name"] = "name";          // UI display attribute field
      expressionAttributeNames["#gsiName"] = "itemName";    // Map to ItemNameIndex GSI key slot
      expressionAttributeValues[":name"] = itemName;
      expressionAttributeValues[":gsiName"] = itemName;
    }
    if (itemCategory !== undefined) {
      updateExpression += " #cat = :cat,";
      expressionAttributeNames["#cat"] = "category";        // Map to CategoryIndex GSI key slot
      expressionAttributeValues[":cat"] = itemCategory;
    }
    if (itempurchasedFrom !== undefined) {
      updateExpression += " #pf = :pf,";
      expressionAttributeNames["#pf"] = "purchasedFrom";    // Map to PurchasedFromIndex GSI key slot
      expressionAttributeValues[":pf"] = itempurchasedFrom;
    }
    
    // Sync the WarrantyIndex GSI properties on target warranty date structural changes
    if (itemwarrantyPeriod !== undefined || itemextendedWarrantyPeriod !== undefined) {
      const finalWarranty = itemextendedWarrantyPeriod || itemwarrantyPeriod || "1970-01-01";
      updateExpression += " #gsiWed = :gsiWed,";
      expressionAttributeNames["#gsiWed"] = "warrantyExpiryDate"; // Map to WarrantyIndex Range GSI key slot
      expressionAttributeValues[":gsiWed"] = finalWarranty;
    }

    // Capture explicit data property modifications
    if (itemwarrantyPeriod !== undefined) {
      updateExpression += " #wp = :wp,";
      expressionAttributeNames["#wp"] = "warrantyPeriod";
      expressionAttributeValues[":wp"] = itemwarrantyPeriod;
    }
    if (itemextendedWarrantyPeriod !== undefined) {
      updateExpression += " #ewp = :ewp,";
      expressionAttributeNames["#ewp"] = "extendedWarrantyPeriod";
      expressionAttributeValues[":ewp"] = itemextendedWarrantyPeriod || null;
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

    // Check if any attributes were actually mapped before attempting to call the database engine
    if (updateExpression === "SET") {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Bad Request: No valid update parameters provided." }),
      };
    }

    // Trim trailing trailing string commas
    updateExpression = updateExpression.slice(0, -1);

    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `CONTAINER#${containerId}`, // Target correct partition row index container bucket
        SK: `ITEM#${itemId}`           // Target specific item entry slot identity matching
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW" 
    };

    console.log("Executing DynamoDB Update Command with parameters:", JSON.stringify(params, null, 2));
    const response = await docClient.send(new UpdateCommand(params));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // Keeps local cross-origin connections happy
      },
      body: JSON.stringify({
        message: `Item ${itemId} updated successfully.`,
        updatedAttributes: response.Attributes
      }),
    };

  } catch (error) {
    console.error("💥 UPDATE ITEM EXCEPTION:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.name, message: error.message }),
    };
  }
};
