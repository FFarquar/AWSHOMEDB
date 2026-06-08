import { handler } from '../../../src/handlers/login.mjs';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import bcrypt from 'bcryptjs';
import { mockClient } from 'aws-sdk-client-mock';

describe('Test login handler', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);

  beforeEach(() => {
    ddbMock.reset();
    process.env.TABLE_NAME = 'test-table';
    process.env.AUTH_SECRET = 'test-secret';
  });

  it('returns a token for a valid user', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          PK: 'USER#Dean_P',
          SK: 'PROFILE',
          loginID: 'Dean_P',
          role: 'ADMIN',
          active: true,
          passwordHash: bcrypt.hashSync('secret', 10),
        },
      ],
    });

    const result = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ loginID: 'Dean_P', password: 'secret' }),
    });

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.accessToken).toBeTruthy();
    expect(body.tokenType).toBe('Bearer');
    expect(body.role).toBe('ADMIN');
  });

  it('accepts an already-parsed body object', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          PK: 'USER#Dean_P',
          SK: 'PROFILE',
          loginID: 'Dean_P',
          role: 'ADMIN',
          active: true,
          passwordHash: bcrypt.hashSync('secret', 10),
        },
      ],
    });

    const result = await handler({
      httpMethod: 'POST',
      body: { loginID: 'Dean_P', password: 'secret' },
    });

    expect(result.statusCode).toBe(200);
  });

  it('rejects invalid credentials', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          PK: 'USER#Dean_P',
          SK: 'PROFILE',
          loginID: 'Dean_P',
          role: 'ADMIN',
          active: true,
          passwordHash: bcrypt.hashSync('secret', 10),
        },
      ],
    });

    const result = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ loginID: 'Dean_P', password: 'wrong' }),
    });

    expect(result.statusCode).toBe(401);
  });
});
