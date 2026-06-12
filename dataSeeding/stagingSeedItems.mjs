import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "AWSHOMEDB-STAGING-Data";

const items = [
  
 {
    "PK": "CONTAINER#CONTAINER2", 
    "SK": "ITEM#ITEM1",            
    "entityType": "ITEM",

    "containerId": "CONTAINER2",
    "itemId": "ITEM1",
    
    // Exact structural fields required by your 4 CloudFormation GSIs
    "itemName": "3 x Bridgestone REE005A tyres",
    "category": "Automotive",
    "purchasedFrom": "Tubbies Tyrepower Kirrawee",
    "warrantyExpiryDate": "2028-06-05",

    // Custom metadata payload properties
    "purchaseDate": "2026-06-05",
    "purchasePrice": 1100,
    "physicalPaperStorageLocation": "Study filing cabinet folder",
    
    // Sub-entity array prepared for your future ATTACHMENT type data layout
    "attachments": [], 
    "createdDate": "2026-06-12"
  },
 {
    "PK": "CONTAINER#CONTAINER2", 
    "SK": "ITEM#ITEM2",            
    "entityType": "ITEM",

    "containerId": "CONTAINER2",
    "itemId": "ITEM2",
    
    // Exact structural fields required by your 4 CloudFormation GSIs
    "itemName": "New battery",
    "category": "Automotive",
    "purchasedFrom": "Coda batteries",
    "warrantyExpiryDate": "2029-06-12",

    // Custom metadata payload properties
    "purchaseDate": "2026-06-05",
    "purchasePrice": 1100,
    "physicalPaperStorageLocation": "Study filing cabinet folder",
    
    // Sub-entity array prepared for your future ATTACHMENT type data layout
    "attachments": [], 
    "createdDate": "2026-06-12"
  } ,
 {
    "PK": "CONTAINER#CONTAINER3", 
    "SK": "ITEM#ITEM3",            
    "entityType": "ITEM",

    "containerId": "CONTAINER3",
    "itemId": "ITEM3",
    
    // Exact structural fields required by your 4 CloudFormation GSIs
    "itemName": "4 New tyres",
    "category": "Automotive",
    "purchasedFrom": "Jax Sutherland",
    "warrantyExpiryDate": "2028-06-01",

    // Custom metadata payload properties
    "purchaseDate": "2028-06-01",
    "purchasePrice": 1000,
    "physicalPaperStorageLocation": "Study filing cabinet folder",
    
    // Sub-entity array prepared for your future ATTACHMENT type data layout
    "attachments": [], 
    "createdDate": "2026-06-12"
  }  
  
];

for (const item of items) {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
  console.log("Inserted:", item.id);
}