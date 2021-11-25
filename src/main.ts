import { debug, getInput, info, setFailed } from '@actions/core';
import { context, getOctokit } from '@actions/github';

run();

async function run(): Promise<void> {
  try {
    const githubToken = getInput('token');
    const hotfixAgainstBranch = getInput('hotfixAgainstBranch');
    const openPrAgainstBranch = getInput('openPrAgainstBranch');
    const labelsInputString = getInput('labels') || '';
    const sharedLabelsInputString = getInput('sharedLabels') || '';
    const checkBranchPrefix = getInput('checkBranchPrefix') || 'hotfix/';
    const labels = (
      labelsInputString ?
        labelsInputString.split(',') :
        [ 'auto-created' ]
    ).map((label) => label.trim());
    const sharedLabels = (
      sharedLabelsInputString ?
      sharedLabelsInputString.split(',') :
        [ 'hotfix' ]
    ).map((label) => label.trim());
    const titlePrefix = getInput('titlePrefix') || '[AUTO]';
    await openPRIfHotfix(
      githubToken,
      hotfixAgainstBranch,
      openPrAgainstBranch,
      titlePrefix,
      labels,
      sharedLabels,
      checkBranchPrefix
    );
  } catch (error) {
    if (error instanceof Error) setFailed(error.message);
  }
}

async function openPRIfHotfix(
  githubToken: string,
  hotfixAgainstBranch: string,
  openPrAgainstBranch: string,
  titlePrefix: string,
  labels: string[],
  sharedLabels: string[],
  checkBranchPrefix: string
): Promise<void> {
  const pullRequest = context.payload.pull_request;
  // const workflowName = process.env.GITHUB_WORKFLOW;

  if (!pullRequest) {
    debug('No pull request found');
    return;
  }

  const baseBranch = pullRequest.base.ref as string;
  const branch = pullRequest.head.ref as string;
  const isHotfix = branch.startsWith(checkBranchPrefix);

  if (!isHotfix || baseBranch !== hotfixAgainstBranch) {
    debug(`Not a hotfix against ${ hotfixAgainstBranch }. skipping...`);
    return;
  }

  const octokit = getOctokit(githubToken);
  const isPrAlreadyExistsCall = await octokit.rest.pulls.list({
    owner: context.repo.owner,
    repo: context.repo.repo,
    state: 'open',
    head: branch
  });
  const isPrAlreadyExists = isPrAlreadyExistsCall.data;

  if (isPrAlreadyExists.length === 1) {
    info(
      `ONE open PR exists for ${ branch }. Creating the second one against ${ openPrAgainstBranch }`
    );
    // only one exists, this should be the right one!
    const existingPR = isPrAlreadyExists[0];
    const prFooter = [
      'This HOTFIX PR was created automatically from ',
      `[PR #${ existingPR.number }](${ existingPR.html_url }) `,
      `by [gitflow-hotfix](https://github.com/marketplace/actions/kibibit-gitflow-hotfix)`
    ].join('');
    const prBody = addPRBodyFooter(existingPR.body, prFooter);
    const createdPRCall = await octokit.rest.pulls.create({
      owner: context.repo.owner,
      repo: context.repo.repo,
      head: branch,
      base: openPrAgainstBranch,
      title: `${ titlePrefix } ${ existingPR.title }`,
      body: prBody
    });
    const createdPR = createdPRCall.data;
    await octokit.rest.issues.addAssignees({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: createdPR.number,
      assignees: existingPR.user?.login ? [ existingPR.user.login ] : []
    });
    await octokit.rest.issues.addLabels({
      owner: context.repo.owner,
      issue_number: createdPR.number,
      repo: context.repo.repo,
      labels: [ ...sharedLabels, ...labels ]
    });
    await octokit.rest.issues.addLabels({
      owner: context.repo.owner,
      issue_number: existingPR.number,
      repo: context.repo.repo,
      labels: [ ...sharedLabels ]
    });

    info(`${ createdPR.head.ref } was created`);
  } else {
    info('More than 1 PR already exists. doing nothing...');
  }
}

function addPRBodyFooter(body: string | null, footer: string) {
  let prBody = body || '';
  prBody += '\n\n-----\n';
  prBody += footer;

  return prBody;
}
