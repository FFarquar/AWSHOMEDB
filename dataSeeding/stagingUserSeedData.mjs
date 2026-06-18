import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "AWSHOMEDB-PROD-Staging";

const items = [
  {
    "PK": "USER#Dean_P",
    "SK": "PROFILE",

    "entityType": "USER",
    "loginID": "Dean_P",
    "role": "ADMIN",
    "active": true,
    "passwordHash" :"$2a$10$FXXV8JUy.YhZEQs2V.Wv/O75bxhdRHC2gq3SvCGOAkfZtylDp9xni"
  },
  {
    "PK": "USER#Jenny_P",
    "SK": "PROFILE",

    "entityType": "USER",
    "loginID": "Jenny_P",
    "role": "USER",
    "active": true,
    "passwordHash" :"$2a$10$FXXV8JUy.YhZEQs2V.Wv/O75bxhdRHC2gq3SvCGOAkfZtylDp9xni"
  }
  
];

for (const item of items) {
  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
  console.log("Inserted:", item.loginID);
}