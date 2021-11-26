"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
run();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const githubToken = (0, core_1.getInput)('token');
            const hotfixAgainstBranch = (0, core_1.getInput)('hotfixAgainstBranch');
            const openPrAgainstBranch = (0, core_1.getInput)('openPrAgainstBranch');
            const labelsInputString = (0, core_1.getInput)('labels') || '';
            const sharedLabelsInputString = (0, core_1.getInput)('sharedLabels') || '';
            const checkBranchPrefix = (0, core_1.getInput)('checkBranchPrefix') || 'hotfix/';
            const labels = (labelsInputString ?
                labelsInputString.split(',') :
                ['auto-created']).map((label) => label.trim());
            const sharedLabels = (sharedLabelsInputString ?
                sharedLabelsInputString.split(',') :
                ['hotfix']).map((label) => label.trim());
            const titlePrefix = (0, core_1.getInput)('titlePrefix') || '[AUTO]';
            yield openPRIfHotfix(githubToken, hotfixAgainstBranch, openPrAgainstBranch, titlePrefix, labels, sharedLabels, checkBranchPrefix);
        }
        catch (error) {
            if (error instanceof Error)
                (0, core_1.setFailed)(error.message);
        }
    });
}
function openPRIfHotfix(githubToken, hotfixAgainstBranch, openPrAgainstBranch, titlePrefix, labels, sharedLabels, checkBranchPrefix) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const pullRequest = github_1.context.payload.pull_request;
        // const workflowName = process.env.GITHUB_WORKFLOW;
        if (!pullRequest) {
            (0, core_1.debug)('No pull request found');
            return;
        }
        const baseBranch = pullRequest.base.ref;
        const branch = pullRequest.head.ref;
        const isHotfix = branch.startsWith(checkBranchPrefix);
        if (!isHotfix || baseBranch !== hotfixAgainstBranch) {
            (0, core_1.debug)(`Not a hotfix against ${hotfixAgainstBranch}. skipping...`);
            return;
        }
        const octokit = (0, github_1.getOctokit)(githubToken);
        const isPrAlreadyExistsCall = yield octokit.rest.pulls.list({
            owner: github_1.context.repo.owner,
            repo: github_1.context.repo.repo,
            state: 'open',
            head: `${github_1.context.repo.owner}:${branch}`
        });
        const isPrAlreadyExists = isPrAlreadyExistsCall.data;
        if (isPrAlreadyExists.length === 1) {
            (0, core_1.info)(`ONE open PR exists for ${branch}. Creating the second one against ${openPrAgainstBranch}`);
            // only one exists, this should be the right one!
            const existingPR = isPrAlreadyExists[0];
            const prFooter = [
                'This HOTFIX PR was created automatically from ',
                `[PR #${existingPR.number}](${existingPR.html_url}) `,
                `by [gitflow-hotfix](https://github.com/marketplace/actions/kibibit-gitflow-hotfix)`
            ].join('');
            const prBody = addPRBodyFooter(existingPR.body, prFooter);
            const createdPRCall = yield octokit.rest.pulls.create({
                owner: github_1.context.repo.owner,
                repo: github_1.context.repo.repo,
                head: branch,
                base: openPrAgainstBranch,
                title: `${titlePrefix} ${existingPR.title}`,
                body: prBody
            });
            const createdPR = createdPRCall.data;
            yield octokit.rest.issues.addAssignees({
                owner: github_1.context.repo.owner,
                repo: github_1.context.repo.repo,
                issue_number: createdPR.number,
                assignees: ((_a = existingPR.user) === null || _a === void 0 ? void 0 : _a.login) ? [existingPR.user.login] : []
            });
            yield octokit.rest.issues.addLabels({
                owner: github_1.context.repo.owner,
                issue_number: createdPR.number,
                repo: github_1.context.repo.repo,
                labels: [...sharedLabels, ...labels]
            });
            yield octokit.rest.issues.addLabels({
                owner: github_1.context.repo.owner,
                issue_number: existingPR.number,
                repo: github_1.context.repo.repo,
                labels: [...sharedLabels]
            });
            (0, core_1.info)(`${createdPR.head.ref} was created`);
        }
        else {
            (0, core_1.info)('More than 1 PR already exists. doing nothing...');
        }
    });
}
function addPRBodyFooter(body, footer) {
    let prBody = body || '';
    prBody += '\n\n-----\n';
    prBody += footer;
    return prBody;
}
