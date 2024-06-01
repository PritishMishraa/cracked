import { writeFile } from "fs/promises";

interface LeetCodeSubmission {
    id: string;
    title: string;
    titleSlug: string;
    timestamp: number;
}

interface Problem {
    contestId: number;
    index: string;
    name: string;
    type: string;
    points: number;
    tags: string[];
}

interface Member {
    handle: string;
}

interface Author {
    contestId: number;
    members: Member[];
    participantType: string;
    ghost: boolean;
    room: number;
    startTimeSeconds: number;
}

interface CodeforcesSubmission {
    id: number;
    contestId: number;
    creationTimeSeconds: number;
    relativeTimeSeconds: number;
    problem: Problem;
    author: Author;
    programmingLanguage: string;
    verdict: string;
}

class Logger {
    log(level: string, message: string): void {
        const timestamp = new Date().toDateString();
        console.log(`[${timestamp}] [${level.toUpperCase()}]: ${message}`);
    }

    info(message: string) {
        this.log('info', message);
    }

    warn(message: string) {
        this.log('warn', message);
    }

    error(message: string) {
        this.log('error', message);
    }
}

const logger = new Logger();

async function getLeetcodeSubmissions(limit = 10): Promise<LeetCodeSubmission[]> {
    logger.info(`Fetching LeetCode submissions with limit: ${limit}`);
    const url = "https://leetcode.com/graphql/";
    const username = "pritish__mishraa";
    const query = `query recentAcSubmissions($username: String!, $limit: Int!) { recentAcSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp }}`;
    const variables = { username, limit };
    const body = JSON.stringify({ query, variables });
    const headers = { "Content-Type": "application/json" };
    const response = await fetch(url, { method: "POST", body, headers });
    if (!response.ok) {
        logger.error("Error fetching LeetCode submissions");
        return [];
    }
    const json = await response.json();
    logger.info(`Fetched ${json.data.recentAcSubmissionList.length} LeetCode submissions`);
    return json.data.recentAcSubmissionList;
}

async function getCodeforcesSubmission(limit = 10): Promise<CodeforcesSubmission[]> {
    logger.info(`Fetching Codeforces submissions with limit: ${limit}`);
    const url = `https://codeforces.com/api/user.status?handle=pritish_1&from=1&count=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
        logger.error("Error fetching Codeforces submissions");
        return [];
    }
    const json = await response.json();
    logger.info(`Fetched ${json.result.length} Codeforces submissions`);
    return json.result;
}

const getTodaySubmission = async () => {
    logger.info("Getting today's submissions from LeetCode and Codeforces");
    
    let leetcodeSubmissions = await getLeetcodeSubmissions();
    let codeforcesSubmissions = await getCodeforcesSubmission();

    const now = new Date();
    const offset = 5.5 * 60 * 60 * 1000;
    const today = new Date(now.getTime() + offset);

    logger.info("Filtering today's LeetCode submissions");
    let leetcodeTodaySubmissions = leetcodeSubmissions.filter(submission => new Date(submission.timestamp * 1000).getDate() == today.getDate());
    let limit = 10;
    while (leetcodeSubmissions.length != 0 && (leetcodeTodaySubmissions.length === leetcodeSubmissions.length)) {
        logger.info(`All fetched LeetCode submissions are from today, increasing limit to ${limit + 10}`);
        leetcodeSubmissions = await getLeetcodeSubmissions(limit + 10);
        leetcodeTodaySubmissions = leetcodeSubmissions.filter(submission => new Date(submission.timestamp * 1000).getDate() == today.getDate());
        limit += 10;
    }

    logger.info("Filtering today's Codeforces submissions");
    let codeforcesTodaySubmissions = codeforcesSubmissions.filter(submission => new Date(submission.creationTimeSeconds * 1000).getDate() == today.getDate());
    limit = 10;
    while (codeforcesSubmissions.length !== 0 && (codeforcesTodaySubmissions.length === codeforcesSubmissions.length)) {
        logger.info(`All fetched Codeforces submissions are from today, increasing limit to ${limit + 10}`);
        codeforcesSubmissions = await getCodeforcesSubmission(limit + 10);
        codeforcesTodaySubmissions = codeforcesSubmissions.filter(submission => new Date(submission.creationTimeSeconds * 1000).getDate() == today.getDate());
        limit += 10;
    }

    logger.info(`LeetCode Today Submissions: ${leetcodeTodaySubmissions.length}, Codeforces Today Submissions: ${codeforcesTodaySubmissions.length}`);

    return { leetcodeTodaySubmissions, codeforcesTodaySubmissions };
}

const generateMarkdown = async () => {
    logger.info("Generating markdown for today's submissions");
    const { leetcodeTodaySubmissions, codeforcesTodaySubmissions } = await getTodaySubmission();

    let markdown =
        `---
title: ${new Date().toDateString()}
layout: ../layouts/blogLayout.astro
date: ${new Date().toISOString()}
summary: ${leetcodeTodaySubmissions.length + codeforcesTodaySubmissions.length} submissions today
---

## Leetcode

<ul>
    ${leetcodeTodaySubmissions.map(submission => `<li> 
    <a href="https://leetcode.com/problems/${submission.titleSlug}/" class="text-blue-600 underline underline-offset-4" target="_blank"> ${submission.title} </a> 
    </li>`).join('')}
</ul>

## Codeforces

<ul>
    ${codeforcesTodaySubmissions.map(submission => `<li>
    <div class="flex flex-col md:flex-row md:justify-between">
    <a href="https://codeforces.com/contest/${submission.contestId}/problem/${submission.problem.index}" class="text-blue-600 underline underline-offset-4" target="_blank"> ${submission.problem.name} </a>
    <p> ${submission.verdict} </p>
    </div>
    </li>`).join('')}
</ul>`;

    try {
        const filePath = `src/pages/${new Date().toDateString()}.md`;
        await writeFile(filePath, markdown);
        logger.info(`Markdown file successfully generated at ${filePath}`);
    } catch (error) {
        logger.error(`Error generating markdown file: ${error}`);
    }

}

generateMarkdown();