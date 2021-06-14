const AWS = require('aws-sdk');
const express = require('express');
const serverless = require('serverless-http');
const axios = require('axios');

const app = express();

const USERS_TABLE = process.env.USERS_TABLE;
const dynamoDbClientParams = {};
if (process.env.IS_OFFLINE) {
  dynamoDbClientParams.region = 'localhost';
  dynamoDbClientParams.endpoint = 'http://localhost:8000';
}
const dynamoDbClient = new AWS.DynamoDB.DocumentClient(dynamoDbClientParams);

app.use(express.json());

const getToken = async () => {
  let options = {
    method: 'POST',
    url: 'https://pitstop-auth.us.auth0.com/oauth/token',
    headers: { 'content-type': 'application/json' },
    data: {
      client_id: 'RRZ2EOHyufWfJUjFqqS2tzCz3pW3VM8x',
      client_secret:
        'Ex5p09hmXjXqySNYIDw-8h-9o12aSmygi420dgS910bg6HNEsWNGwMnkOAl1POgF',
      audience: 'https://pitstop-auth.us.auth0.com/api/v2/',
      grant_type: 'client_credentials',
    },
  };

  let token = null;
  try {
    const result = await axios.request(options);
    if (result.status !== 200) throw new Error(error);

    console.log(result.data);
    token = result.data.access_token;
    return token;
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Could not retrieve user' });
    return token;
  }
};

app.get('/test', async function (req, res) {
  const token = await getToken();
  try {
    //   console.log(token, 'Here');

    options = {
      method: 'GET',
      url: 'https://pitstop-auth.us.auth0.com/api/v2/users',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
    };
    const result = await axios.request(options);
    res.send(result.data);
    //   request(options, function (error, response, body) {
    //     if (error) throw new Error(error);
    //     console.log(body);
    //     res.send(body);
    //   });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Could not retrieve user' });
  }
});

app.get('/users/:userId', async function (req, res) {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
  };

  try {
    const { Item } = await dynamoDbClient.get(params).promise();
    if (Item) {
      const { userId, name } = Item;
      res.json({ userId, name });
    } else {
      res
        .status(404)
        .json({ error: 'Could not find user with provided "userId"' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Could not retreive user' });
  }
});

app.post('/users', async function (req, res) {
  const { userId, name } = req.body;
  if (typeof userId !== 'string') {
    res.status(400).json({ error: '"userId" must be a string' });
  } else if (typeof name !== 'string') {
    res.status(400).json({ error: '"name" must be a string' });
  }

  const params = {
    TableName: USERS_TABLE,
    Item: {
      userId: userId,
      name: name,
    },
  };

  try {
    await dynamoDbClient.put(params).promise();
    res.json({ userId, name });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Could not create user' });
  }
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: 'Not Found',
  });
});

module.exports.handler = serverless(app);
