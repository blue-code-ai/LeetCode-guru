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

  fetch("data/all_questions.json")
    .then(res => res.json())
    .then(data => {
      allQuestions = data;
      console.log("All questions loaded:", allQuestions.length);

      if (cached && cached.username && cached.recentSolved) {
        usernameInput.value = cached.username;
        displaySolvedQuestions(cached.recentSolved);
        statusMessage.innerText = `Loaded cached data for @${cached.username}`;
      }
    });
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
  const MAX_VISIBLE = 5;
  const solvedList = document.getElementById("solvedList");
  const toggleBtn = document.getElementById("toggleViewBtn");
  let expanded = false;

  function getQuestionNumber(titleSlug) {
    const match = allQuestions.find(q => q.titleSlug === titleSlug);
    return match ? match.frontendQuestionId : null;
  }

  function renderList() {
    solvedList.innerHTML = "";

    const visibleProblems = expanded ? problems : problems.slice(0, MAX_VISIBLE);

    visibleProblems.forEach((problem) => {
      const item = document.createElement("div");
      item.className = "question-item";

      const titleLink = document.createElement("a");
      titleLink.href = `https://leetcode.com/problems/${problem.titleSlug}`;
      titleLink.target = "_blank";

      const qNum = getQuestionNumber(problem.titleSlug);
      titleLink.innerText = qNum ? `#${qNum} - ${problem.title}` : problem.title;

      const timeInfo = document.createElement("small");
      const timeAgo = getTimeAgo(problem.timestamp);
      timeInfo.innerText = `Solved ${timeAgo}`;

      item.appendChild(titleLink);
      item.appendChild(timeInfo);
      solvedList.appendChild(item);
    });

    // Toggle button visibility
    if (problems.length > MAX_VISIBLE) {
      toggleBtn.style.display = "block";
      toggleBtn.innerText = expanded ? "Collapse" : "View All";
    } else {
      toggleBtn.style.display = "none";
    }
  }

  // Attach toggle handler
  toggleBtn.onclick = () => {
    expanded = !expanded;
    renderList();
  };
  renderList();
}

function getUnsolvedQuestions(solvedList) {
  const solvedSlugs = new Set(solvedList.map(q => q.titleSlug));
  return allQuestions.filter(q => !solvedSlugs.has(q.titleSlug));
}

function recommendQuestions(type, solvedList) {
  const unsolved = getUnsolvedQuestions(solvedList);
  const solvedInfo = solvedList.map(solved => {
    const ref = allQuestions.find(q => q.titleSlug === solved.titleSlug);
    return ref ? ref : null;
  }).filter(Boolean);

  const recentTopics = new Set();
  solvedInfo.forEach(q => {
    const tags = JSON.parse(q.topicTags.replace(/'/g, '"')); // handle weird stringified array
    tags.forEach(tag => recentTopics.add(tag));
  });

  let pool = [];

  if (type === "random") {
    pool = unsolved;
  } else if (type === "same-topic") {
    pool = unsolved.filter(q =>
      JSON.parse(q.topicTags.replace(/'/g, '"')).some(tag => recentTopics.has(tag))
    );
  } else if (type === "same-topic-harder") {
    pool = unsolved.filter(q => {
      const tags = JSON.parse(q.topicTags.replace(/'/g, '"'));
      return tags.some(tag => recentTopics.has(tag)) && q.difficulty !== "Easy";
    });
  } else if (type === "different-topic-same") {
    const targetDiffs = new Set(solvedInfo.map(q => q.difficulty));
    pool = unsolved.filter(q => {
      const tags = JSON.parse(q.topicTags.replace(/'/g, '"'));
      return !tags.some(tag => recentTopics.has(tag)) && targetDiffs.has(q.difficulty);
    });
  }

  if (pool.length === 0) return [];

  // Shuffle and return 3
  return pool.sort(() => 0.5 - Math.random()).slice(0, 3);
}

function getTimeAgo(timestamp) {
  const now = Date.now() / 1000;
  const diff = Math.floor(now - timestamp);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

document.getElementById("getRecommendBtn").onclick = () => {
  const type = document.getElementById("recommendType").value;
  const cached = JSON.parse(localStorage.getItem("leetbuddy_user"));
  if (!cached || !cached.recentSolved) return alert("Fetch your solved problems first!");

  const recommended = recommendQuestions(type, cached.recentSolved);
  displayRecommendations(recommended);
};

function displayRecommendations(recommended) {
  const container = document.getElementById("recommendations");
  container.innerHTML = "<h3>Recommended Questions:</h3>";

  recommended.forEach(q => {
    const div = document.createElement("div");
    div.className = "question-item";

    const link = document.createElement("a");
    link.href = `https://leetcode.com/problems/${q.titleSlug}`;
    link.target = "_blank";
    // link.innerText = `#${q.frontendQuestionId} - ${q.title} (${q.difficulty})`;
    const diffColor = q.difficulty === "Easy" ? "#3fb950"
               : q.difficulty === "Medium" ? "#d29922"
               : "#f85149"

    link.innerHTML = `#${q.frontendQuestionId} - ${q.title} 
      <span style="color: ${diffColor}; font-weight: normal;">(${q.difficulty})</span>`;


    div.appendChild(link);
    container.appendChild(div);
  });

  if (recommended.length === 0) {
    container.innerHTML += "<p>No suitable recommendations found.</p>";
  }
}
