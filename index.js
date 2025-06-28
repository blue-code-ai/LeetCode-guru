// script.js

const fetchBtn = document.getElementById("fetchBtn");
const usernameInput = document.getElementById("usernameInput");
const solvedList = document.getElementById("solvedList");
const statusMessage = document.getElementById("statusMessage");

const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";
const GRAPHQL_ENDPOINT = CORS_PROXY + "https://leetcode.com/graphql";

const MAX_RESULTS = 20;

// Try loading from localStorage on page load
window.onload = () => {
  const cached = JSON.parse(localStorage.getItem("leetbuddy_user"));
  if (cached && cached.username && cached.recentSolved) {
    usernameInput.value = cached.username;
    displaySolvedQuestions(cached.recentSolved);
    statusMessage.innerText = `Loaded cached data for @${cached.username}`;
  }
};

fetchBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim();

  if (!username) {
    statusMessage.innerText = "Please enter a valid username.";
    return;
  }

  statusMessage.innerText = "Fetching recent solved problems...";
  solvedList.innerHTML = "";

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operationName: "recentAcSubmissions",
        variables: { username },
        query: `
          query recentAcSubmissions($username: String!) {
            recentAcSubmissionList(username: $username) {
              title
              titleSlug
              timestamp
            }
          }
        `,
      }),
    });

    const data = await response.json();
    const submissions = data.data?.recentAcSubmissionList || [];

    if (!submissions.length) {
      statusMessage.innerText = `No recent solves found for @${username}.`;
      return;
    }

    // Limit results for display
    const recentSolved = submissions.slice(0, MAX_RESULTS);
    displaySolvedQuestions(recentSolved);

    // Save to localStorage
    localStorage.setItem(
      "leetbuddy_user",
      JSON.stringify({ username, recentSolved })
    );

    statusMessage.innerText = `Showing recent solved problems for @${username}`;
  } catch (err) {
    console.error(err);
    statusMessage.innerText = "Error fetching data. Maybe username is wrong or LeetCode is blocking us.";
  }
});

function displaySolvedQuestions(problems) {
  solvedList.innerHTML = "";

  problems.forEach((problem) => {
    const item = document.createElement("div");
    item.className = "question-item";

    const titleLink = document.createElement("a");
    titleLink.href = `https://leetcode.com/problems/${problem.titleSlug}`;
    titleLink.target = "_blank";
    titleLink.innerText = problem.title;

    const timeInfo = document.createElement("small");
    const timeAgo = getTimeAgo(problem.timestamp);
    timeInfo.innerText = `Solved ${timeAgo}`;

    item.appendChild(titleLink);
    item.appendChild(timeInfo);

    solvedList.appendChild(item);
  });
}

function getTimeAgo(timestamp) {
  const now = Date.now() / 1000;
  const diff = Math.floor(now - timestamp);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}
