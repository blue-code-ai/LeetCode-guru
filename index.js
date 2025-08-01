// script.js

const fetchBtn = document.getElementById("fetchBtn");
const usernameInput = document.getElementById("usernameInput");
const solvedList = document.getElementById("solvedList");
const statusMessage = document.getElementById("statusMessage");
const toggleBtn = document.getElementById("toggleViewBtn");

const VERCEL_ENDPOINT = "https://leet-code-guru.vercel.app/api/fetchSolved";

const MAX_RESULTS = 20;

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

	const topicSelector = document.getElementById("topicSelector");
	const toggleTopicsBtn = document.getElementById("toggleTopicsBtn");
	const difficultySelect = document.getElementById("difficultySelect");

	// Hide before rendering
	topicSelector.classList.add("hidden");

	// Render topic buttons
	topicSelector.innerHTML = "";
	topics.forEach(topic => {
		const btn = document.createElement("button");
		btn.className = "topic-btn";
		btn.innerText = topic;
		if (cached.selectedTopics?.includes(topic)) btn.classList.add("selected");
		btn.onclick = () => {
			btn.classList.toggle("selected");
			saveFilters();
		};
		topicSelector.appendChild(btn);
	});

	// Set difficulty selector
	difficultySelect.value = cached.selectedDifficulty || "all";
	difficultySelect.onchange = saveFilters;

	toggleTopicsBtn.onclick = () => {
		topicSelector.classList.toggle("hidden");
	};
};

fetchBtn.addEventListener("click", async () => {
	const username = usernameInput.value.trim();
	const toggleBtn = document.getElementById("toggleViewBtn");
	const recommendSection = document.getElementById("recommendSection");
	const recommendations = document.getElementById("recommendations");

	if (!username) {
		statusMessage.innerText = "Please enter a valid username.";
		toggleBtn.style.display = "none";
		recommendSection.style.display = "none";
		recommendations.innerHTML = "";
		return;
	}

	statusMessage.innerText = "Fetching recent solved problems...";
	solvedList.innerHTML = "";
	toggleBtn.style.display = "none";
	recommendSection.style.display = "none";
	recommendations.innerHTML = "";

	try {
		const response = await fetch(VERCEL_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ username })
		});

		const data = await response.json();
		const submissions = data || [];

		if (!submissions.length) {
			statusMessage.innerText = `No recent solves found for @${username}.`;
			toggleBtn.style.display = "none";
			recommendSection.style.display = "none";
			recommendations.innerHTML = "";
			return;
		}

		const recentSolved = submissions.slice(0, MAX_RESULTS);
		displaySolvedQuestions(recentSolved);

		localStorage.setItem("leetbuddy_user", JSON.stringify({
			username,
			recentSolved
		}));

		statusMessage.innerText = `Showing recent solved problems for @${username}`;
	} catch (err) {
		console.error(err);
		statusMessage.innerText = "Error fetching data. Check your network or try again later.";
		toggleBtn.style.display = "none";
		recommendSection.style.display = "none";
		recommendations.innerHTML = "";
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

		if (problems.length === 0) {
			solvedList.innerHTML = "<p>No solved problems to display.</p>";
			toggleBtn.style.display = "none";
			document.getElementById("recommendSection").style.display = "none";
			return;
		}

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

		// Show/hide view toggle button
		if (problems.length > MAX_VISIBLE) {
			toggleBtn.style.display = "block";
			toggleBtn.innerText = expanded ? "Collapse" : "View All";
		} else {
			toggleBtn.style.display = "none";
		}

		// Show recommendation controls
		document.getElementById("recommendSection").style.display = "flex";
	}

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

function recommendQuestions(solvedList) {
	const isPremium = document.getElementById("isPremiumUser")?.checked;
	const selectedDifficulty = document.getElementById("difficultySelect")?.value || "all";
	const selectedTopics = Array.from(document.querySelectorAll(".topic-btn.selected")).map(btn => btn.innerText);

	const solvedSlugs = new Set(solvedList.map(q => q.titleSlug));

	const filtered = allQuestions.filter(q => {
		if (!isPremium && q.paidOnly) return false;
		if (solvedSlugs.has(q.titleSlug)) return false;

		let tags = [];
		try {
			tags = JSON.parse(q.topicTags.replace(/'/g, '"'));
		} catch (e) {
			console.warn("Failed to parse topic tags for:", q.titleSlug);
		}

		// Topic filter (only if any topic selected)
		const topicMatch = selectedTopics.length === 0 || tags.some(tag => selectedTopics.includes(tag));
		if (!topicMatch) return false;

		// Difficulty filter
		const difficultyMatch = selectedDifficulty === "all" || q.difficulty === selectedDifficulty;
		if (!difficultyMatch) return false;

		return true;
	});

	return filtered.sort(() => 0.5 - Math.random()).slice(0, 3);
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

	const cached = JSON.parse(localStorage.getItem("leetbuddy_user"));
	if (!cached || !cached.recentSolved) return alert("Fetch your solved problems first!");

	const recommended = recommendQuestions(cached.recentSolved);
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

const topics = [
	"Array", "String", "Two Pointers", "Stack", "Queue",
	"Linked List", "Tree", "Binary Tree", "Trie",
	"Backtracking", "Dynamic Programming", "Greedy", "Graph",
	"DFS", "BFS", "Math", "Bit Manipulation", "Sliding Window",
	"Binary Search", "Sorting", "Heap", "Design", "Database",
	"Shell", "Concurrency"
];



// Load saved state
const cached = JSON.parse(localStorage.getItem("leetbuddy_user")) || {};
const topicSelector = document.getElementById("topicSelector");
const toggleTopicsBtn = document.getElementById("toggleTopicsBtn");
const difficultySelect = document.getElementById("difficultySelect");

// Render topic buttons

// Ensure it starts hidden
topicSelector.classList.add("hidden");

// Render topic buttons
topicSelector.innerHTML = "";
topics.forEach(topic => {
	const btn = document.createElement("button");
	btn.className = "topic-btn";
	btn.innerText = topic;

	if (cached.selectedTopics?.includes(topic)) btn.classList.add("selected");

	btn.onclick = () => {
		btn.classList.toggle("selected");
		saveFilters();
	};

	topicSelector.appendChild(btn);
});

// Toggle box visibility when button is clicked
toggleTopicsBtn.onclick = () => {
	const isHidden = topicSelector.classList.contains("hidden");

	topicSelector.classList.toggle("hidden", !isHidden);
	topicSelector.classList.toggle("flex-grid", isHidden);
};

// Handle difficulty change
difficultySelect.value = cached.selectedDifficulty || "all";
difficultySelect.onchange = saveFilters;

function saveFilters() {
	const selectedTopics = Array.from(document.querySelectorAll(".topic-btn.selected")).map(btn => btn.innerText);
	const selectedDifficulty = difficultySelect.value;

	localStorage.setItem("leetbuddy_user", JSON.stringify({
		...cached,
		selectedTopics,
		selectedDifficulty
	}));
}
