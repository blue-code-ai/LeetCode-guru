
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const body = JSON.parse(event.body);
  const username = body.username;

  if (!username) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Username is required' })
    };
  }

  const query = {
    query: `
      query recentSolved($username: String!) {
        recentSubmissionList(username: $username) {
          title
          titleSlug
          timestamp
        }
      }
    `,
    variables: { username }
  };

  try {
    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(query)
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Failed to fetch from LeetCode" })
      };
    }

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data.data.recentSubmissionList)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error", details: error.message })
    };
  }
};
