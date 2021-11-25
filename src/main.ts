import { debug, getInput, info, setFailed, setOutput } from '@actions/core';
import { context, getOctokit } from '@actions/github';

run();

async function run(): Promise<void> {
  try {
    const githubToken = getInput('token');
    const hotfixAgainstBranch = getInput('hotfixAgainstBranch');
    const openPrAgainstBranch = getInput('openPrAgainstBranch');
    const labelsInputString = getInput('labels') || '';
    const labels = (
      labelsInputString ?
        labelsInputString.split(',') :
        [ 'auto-created', 'hotfix' ]
    ).map((label) => label.trim());
    const titlePrefix = getInput('titlePrefix') || '[AUTO]';
    await openPRIfHotfix(
      githubToken,
      hotfixAgainstBranch,
      openPrAgainstBranch,
      titlePrefix,
      labels
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
  labels: string[]
): Promise<void> {
  const pullRequest = context.payload.pull_request;

  if (!pullRequest) {
    debug('No pull request found');
    return;
  }

  const baseBranch = pullRequest.base.ref as string;

  if (baseBranch !== hotfixAgainstBranch) {
    debug(`Not a hotfix against ${ hotfixAgainstBranch }`);
    return;
  }

  const branch = pullRequest.head.ref as string;
  const isHotfix = branch.startsWith('hotfix/');

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
    const createdPRCall = await octokit.rest.pulls.create({
      owner: context.repo.owner,
      repo: context.repo.repo,
      head: branch,
      base: openPrAgainstBranch,
      title: `${ titlePrefix } ${ existingPR.title }`,
      body: existingPR.body as string
    });
    const createdPR = createdPRCall.data;
    await octokit.rest.issues.addLabels({
      owner: context.repo.owner,
      issue_number: createdPR.number,
      repo: context.repo.repo,
      labels
    });

    info(`${ createdPR.head.ref } was created`);
  } else {
    info('More than 1 PR already exists. doing nothing...');
  }

  setOutput('branch', branch);
  setOutput('isHotfix', isHotfix);
}
