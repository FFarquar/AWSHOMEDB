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

    const body = JSON.parse(event.body || "{}");
    
    const { 
      name, 
      photoLocation, 
      purchaseDate, 
      warrantyFinishDate, 
      extendedWarrantyFinishDate, 
      purchasePrice 
    } = body;

    // Check that at least one valid field was provided to update
    if (!name && !photoLocation && !purchaseDate && !warrantyFinishDate && extendedWarrantyFinishDate === undefined && purchasePrice === undefined) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No valid update fields provided in payload body." }),
      };
    }

    // Dynamically build the Update Expression
    let updateExpression = "SET";
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (name !== undefined) {
      updateExpression += " #name = :name, #itemName = :itemName,";
      expressionAttributeNames["#name"] = "name";
      expressionAttributeNames["#itemName"] = "itemName"; // Sync for ItemNameIndex GSI
      expressionAttributeValues[":name"] = name;
      expressionAttributeValues[":itemName"] = name;
    }
    if (photoLocation !== undefined) {
      updateExpression += " #photoLocation = :photoLocation,";
      expressionAttributeNames["#photoLocation"] = "photoLocation";
      expressionAttributeValues[":photoLocation"] = photoLocation;
    }
    if (purchaseDate !== undefined) {
      updateExpression += " #purchaseDate = :purchaseDate,";
      expressionAttributeNames["#purchaseDate"] = "purchaseDate";
      expressionAttributeValues[":purchaseDate"] = purchaseDate;
    }
    
    // Sync the WarrantyIndex GSI properties on date changes
    if (warrantyFinishDate !== undefined || extendedWarrantyFinishDate !== undefined) {
      const finalWarranty = extendedWarrantyFinishDate || warrantyFinishDate || "1970-01-01";
      updateExpression += " #warrantyExpiryDate = :warrantyExpiryDate,";
      expressionAttributeNames["#warrantyExpiryDate"] = "warrantyExpiryDate";
      expressionAttributeValues[":warrantyExpiryDate"] = finalWarranty;
    }

    if (warrantyFinishDate !== undefined) {
      updateExpression += " #warrantyFinishDate = :warrantyFinishDate,";
      expressionAttributeNames["#warrantyFinishDate"] = "warrantyFinishDate";
      expressionAttributeValues[":warrantyFinishDate"] = warrantyFinishDate;
    }
    if (extendedWarrantyFinishDate !== undefined) {
      updateExpression += " #extendedWarrantyFinishDate = :extendedWarrantyFinishDate,";
      expressionAttributeNames["#extendedWarrantyFinishDate"] = "extendedWarrantyFinishDate";
      expressionAttributeValues[":extendedWarrantyFinishDate"] = extendedWarrantyFinishDate || null;
    }
    if (purchasePrice !== undefined) {
      updateExpression += " #purchasePrice = :purchasePrice,";
      expressionAttributeNames["#purchasePrice"] = "purchasePrice";
      expressionAttributeValues[":purchasePrice"] = purchasePrice;
    }

    // Trim trailing comma
    updateExpression = updateExpression.slice(0, -1);

    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `CONTAINER#${containerId}`,
        SK: "METADATA" // ✨ FIXED: Correctly targets the base data row instead of generating a duplicate
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW" 
    };

    console.log("Executing DynamoDB Update Command on:", params.Key);
    const response = await docClient.send(new UpdateCommand(params));

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
    console.error("💥 UPDATE EXCEPTION:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.name, message: error.message }),
    };
  }
};
