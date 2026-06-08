import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "AWSHOMEDB-STAGING-Data";

const items = [
  {
    "PK": "CONTAINER#CONTAINER1",
    "SK": "METADATA",

    "entityType": "CONTAINER",

    "containerId": "CONTAINER#CONTAINER1",
    "name": "House at Loftys",

    "photoLocation": "containers/container1/main.jpg",

    "purchaseDate": "2018-01-15",
    "warrantyFinishDate": "2018-01-15",
    "extendedWarrantyFinishDate": "2030-01-15",

    "purchasePrice": 600000
    
  },
  {
    "PK": "CONTAINER#CONTAINER2",
    "SK": "METADATA",

    "entityType": "CONTAINER",

    "containerId": "CONTAINER#CONTAINER2",
    "name": "HOLDEN",

    "photoLocation": "containers/container2/HSV.jpg",

    "purchaseDate": "2012-09-20",
    "warrantyFinishDate": "2017-09-20",
    "extendedWarrantyFinishDate": null,

    "purchasePrice": 85000
  },
  {
    "PK": "CONTAINER#CONTAINER3",
    "SK": "METADATA",

    "entityType": "CONTAINER",

    "containerId": "CONTAINER#CONTAINER3",
    "name": "SUBARU",

    "photoLocation": "containers/container3/Subbie.jpg",

    "purchaseDate": "2020-09-20",
    "warrantyFinishDate": "2021-09-20",
    "extendedWarrantyFinishDate": null,

    "purchasePrice": 25000
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