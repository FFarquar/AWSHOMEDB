import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// Initialize the DynamoDB Document Client for ap-southeast-2 (Sydney)
const client = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
  console.log("===== CREATE ITEM INVOKED =====");
  console.log(JSON.stringify(event, null, 2));

  try {
    // 1. Extract the parent container identity from the nested path
    const containerId = event.pathParameters?.containerId;
    if (!containerId) {
      return {
        statusCode: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Bad Request: Missing parent containerId path parameter." }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    
    // Validate required fields
    if (!body.itemName) {
      return {
        statusCode: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Validation Error: itemName is a required field." }),
      };
    }

    // 2. Generate a unique item identifier
    const uniqueId = "ITEM" + Date.now();

    // 3. Prevent GSI crashes: Ensure the warranty range key has a safe string fallback
    const finalWarranty = body.itemextendedWarrantyPeriod || body.itemwarrantyPeriod || "1970-01-01";

    // 4. Build the Single-Table payload layout
    const itemPayload = {
      // Primary Composite Keys
      PK: `CONTAINER#${containerId}`,          // Groups items under their parent container partition
      SK: `ITEM#${uniqueId}`,                  // Unique identity sort key inside this container

      // Core Discriminator Field
      entityType: "ITEM",

      // Identity Attributes
      containerId: containerId,
      itemId: uniqueId,

      // Base Global Secondary Index Field Mappings (Matches CloudFormation requirements)
      itemName: body.itemName,                 // Links to ItemNameIndex
      category: body.itemCategory || "General", // Links to CategoryIndex
      purchasedFrom: body.itempurchasedFrom || "Unknown", // Links to PurchasedFromIndex
      warrantyExpiryDate: finalWarranty,       // Links to WarrantyIndex (Range Key)

      // Custom Metadata Attributes
      purchaseDate: body.itempurchaseDate || null,
      purchasePrice: Number(body.itempurchasePrice) || 0,
      physicalPaperStorageLocation: body.itemphysicalPaperStorageLocation || "",
      
      // Structural array properties to handle nested attachment objects later
      attachments: body.itemAttachments || [],
      
      // Tracking Metadata
      createdDate: new Date().toISOString().split('T')[0] // Formats cleanly as YYYY-MM-DD
    };

    console.log("Saving Item Payload to DynamoDB:", JSON.stringify(itemPayload, null, 2));

    // 5. Execute the insert operation
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: itemPayload
    }));

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // Allows smooth local frontend development cross-origin connection
      },
      body: JSON.stringify({
        message: "Item registered successfully inside container.",
        item: itemPayload
      }),
    };

  } catch (error) {
    console.error("💥 CREATE ITEM EXCEPTION:", error);
    return {
      statusCode: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: error.name, message: error.message }),
    };
  }
};
