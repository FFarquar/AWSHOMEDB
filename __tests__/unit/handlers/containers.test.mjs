import { handler } from '../../../src/handlers/containers.mjs';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

describe('Test containers handler', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
    process.env.TABLE_NAME = 'test-table';
  });

  it('queries the container record for a bare container id', async () => {
    ddbMock.on(QueryCommand).callsFake((command) => {
      expect(command.input).toEqual({
        TableName: 'test-table',
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': 'CONTAINER#CONTAINER1',
          ':sk': 'METADATA',
        },
      });

      return Promise.resolve({ Items: [{ PK: 'CONTAINER#CONTAINER1', SK: 'METADATA' }] });
    });

    const result = await handler({ pathParameters: { id: 'CONTAINER1' } });

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual([{ PK: 'CONTAINER#CONTAINER1', SK: 'METADATA' }]);
  });

  it('does not double-prefix an id that already contains CONTAINER#', async () => {
    ddbMock.on(QueryCommand).callsFake((command) => {
      expect(command.input).toEqual({
        TableName: 'test-table',
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': 'CONTAINER#CONTAINER1',
          ':sk': 'METADATA',
        },
      });

      return Promise.resolve({ Items: [{ PK: 'CONTAINER#CONTAINER1', SK: 'METADATA' }] });
    });

    const result = await handler({ pathParameters: { id: 'CONTAINER#CONTAINER1' } });

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual([{ PK: 'CONTAINER#CONTAINER1', SK: 'METADATA' }]);
  });
});
