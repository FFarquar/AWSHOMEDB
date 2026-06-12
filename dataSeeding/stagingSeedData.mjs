import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-2" });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "AWSHOMEDB-STAGING-Data";

const items = [
  {
    "PK": "CONTAINER#CONTAINER1",
    "SK": "METADATA",
    "entityType": "CONTAINER",

    // 1. FIXED: Strip 'CONTAINER#' prefix to match clean string user requirements
    "containerId": "CONTAINER1", 
    "name": "House at Loftys",
    "photoLocation": "containers/container1/main.jpg",

    "purchaseDate": "2018-01-15",
    "warrantyFinishDate": "2018-01-15",
    // 2. FIXED: Clear empty string fields to prevent native string literal "null" bugs
    "extendedWarrantyFinishDate": "2030-01-15", 
    "purchasePrice": 600000,
    "createdDate": "2026-06-10",

    // 3. ADDED: Required CloudFormation GSI tracking properties to feed structural indexes
    "itemName": "House at Loftys",               // Feeds ItemNameIndex
    "category": "Real Estate",                    // Feeds CategoryIndex
    "purchasedFrom": "Unknown",                   // Feeds PurchasedFromIndex
    "warrantyExpiryDate": "2030-01-15"            // Feeds WarrantyIndex (Range Key)
  },
  {
    "PK": "CONTAINER#CONTAINER2",
    "SK": "METADATA",
    "entityType": "CONTAINER",

    "containerId": "CONTAINER2", 
    "name": "HOLDEN",
    "photoLocation": "containers/container2/HSV.jpg",

    "purchaseDate": "2012-09-20",
    "warrantyFinishDate": "2017-09-20",
    "extendedWarrantyFinishDate": "", 
    "purchasePrice": 85000,
    "createdDate": "2026-06-12",

    // GSI Fallbacks (Uses standard warranty date since extended is blank)
    "itemName": "HOLDEN",
    "category": "Automotive",
    "purchasedFrom": "Unknown",
    "warrantyExpiryDate": "2017-09-20"            
  },
  {
    "PK": "CONTAINER#CONTAINER3",
    "SK": "METADATA",
    "entityType": "CONTAINER",

    "containerId": "CONTAINER3", 
    "name": "SUBARU",
    "photoLocation": "containers/container3/Subbie.jpg",

    "purchaseDate": "2020-09-20",
    "warrantyFinishDate": "2021-09-20",
    "extendedWarrantyFinishDate": "", 
    "purchasePrice": 25000,
    "createdDate": "2026-06-10",

    // GSI Fallbacks (Uses standard warranty date since extended is blank)
    "itemName": "SUBARU",
    "category": "Automotive",
    "purchasedFrom": "Unknown",
    "warrantyExpiryDate": "2021-09-20"            
  } 
];

console.log("🚀 Starting database seeding sequence...");

for (const item of items) {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
  // 4. FIXED: Changed non-existent item.id mapping key parameter references to item.PK
  console.log(`✅ Successfully Seeded: [${item.entityType}] - Key: ${item.PK}`);
}

console.log("🎉 Seeding sequence complete.");
