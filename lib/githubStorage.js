export async function uploadQuizToGithub(quizId, payload) {
  const token = process.env.GITHUB_PAT;
  const owner = process.env.GITHUB_OWNER || 'WordGridBot';
  const repo = process.env.GITHUB_REPO || 'Quizy';

  if (!token) {
    throw new Error("GITHUB_PAT environment variable is missing on server");
  }

  const path = `quizzes/${quizId}.json`;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const contentBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Quizy-App',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Save quiz ${quizId}`,
      content: contentBase64,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub upload failed: ${res.status} ${res.statusText} - ${errText}`);
  }

  return path;
}

export async function fetchQuizFromGithub(githubPath) {
  const owner = process.env.GITHUB_OWNER || 'WordGridBot';
  const repo = process.env.GITHUB_REPO || 'Quizy';

  const cdnUrl = `https://cdn.jsdelivr.net/gh/${owner}/${repo}/${githubPath}`;
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${githubPath}`;

  try {
    const res = await fetch(cdnUrl);
    if (!res.ok) throw new Error(`jsDelivr returned status ${res.status}`);
    return await res.json();
  } catch (cdnError) {
    console.warn(`jsDelivr fetch failed, falling back to GitHub Raw URL:`, cdnError);
    const res = await fetch(rawUrl);
    if (!res.ok) {
      throw new Error(`GitHub Raw URL returned status ${res.status}`);
    }
    return await res.json();
  }
}
