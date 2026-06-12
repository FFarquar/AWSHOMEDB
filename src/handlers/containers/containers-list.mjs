import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

//a temp handler to see if we get a response
// export const handler = async (event) => {
//   console.log("STEP 1 TEST - Lambda reached");

//   return {
//     statusCode: 200,
//     headers: {
//       "Content-Type": "application/json"
//     },
//     body: JSON.stringify({
//       message: "Lambda is working",
//       stage: "step1-test"
//     })
//   };
// };
console.log(">>> CONTAINERS LAMBDA LOADED <<<");

export const handler = async (event) => {

  console.log("===== CONTAINERS LIST =====");
  console.log(JSON.stringify(event, null, 2));
  
  try {
    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        // 👇 Change this line to look for METADATA rows only
        FilterExpression: "SK = :sk",
        ExpressionAttributeValues: {
          ":sk": "METADATA",
        },
      })
    );

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0" // 🚀 Instructs Postman/CloudFront to drop cache
      },      
      body: JSON.stringify(result.Items || []),
    };

  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: err.message,
      }),
    };
  }
};