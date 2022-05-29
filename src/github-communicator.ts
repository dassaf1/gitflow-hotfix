import { debug, info } from '@actions/core';
import { getOctokit } from '@actions/github';
import { Context } from '@actions/github/lib/context';

export enum StatusMessage {
  PENDING = 'Checking if hotfix branch',
  NOT_HOTFIX = 'Not a hotfix',
  CREATING_PR = 'Creating PR',
  PR_CREATED = 'PR created',
  ALREADY_EXISTS = 'PR already exists',
  ERROR = 'Something went wrong',
}

export interface IGithubInput {
  githubToken: string;
  hotfixAgainstBranch: string;
  openPrAgainstBranch: string;
  titlePrefix: string;
  labels: string[];
  sharedLabels: string[];
  checkBranchPrefix: string;
  context: Context;
}

export interface IStatusCheck {
  label: string;
  currentStatus: string;
  state: 'error' | 'failure' | 'pending' | 'success';
}

export interface IGithubPullRequest {
  base: {
    ref: string;
  };
  head: {
    ref: string;
    sha: string;
  };
}

export class GithubCommunicator {
  options: IGithubInput;
  octokit;
  context: Context;
  statusCheckName = 'gitflow-hotfix';
  constructor(options: IGithubInput) {
    this.options = options;
    this.context = options.context;
    this.octokit = getOctokit(this.options.githubToken);
  }

  async openPRIfHotfix() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pullRequest: IGithubPullRequest = this.context.payload.pull_request as any;

    if (!pullRequest) {
      throw new Error(`No pull request found in context`);
    }

    try {
      const workflowName = process.env.GITHUB_WORKFLOW;
      debug(`workflowName: ${ workflowName }`);

      if (!pullRequest) {
        debug('No pull request found');
        return;
      }

      await this.setStatus({
        label: this.statusCheckName,
        currentStatus: StatusMessage.PENDING,
        state: 'pending'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, pullRequest);

      const baseBranch = pullRequest.base.ref as string;
      const branch = pullRequest.head.ref as string;
      const isHotfix = branch.startsWith(this.options.checkBranchPrefix);

      if (!isHotfix || baseBranch !== this.options.hotfixAgainstBranch) {
        info(`Not a hotfix against ${ this.options.hotfixAgainstBranch }. skipping...`);
        await this.setStatus({
          label: this.statusCheckName,
          currentStatus: StatusMessage.NOT_HOTFIX,
          state: 'success'
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }, pullRequest);
        return;
      }

      const isPrAlreadyExistsCall = await this.octokit.rest.pulls.list({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        state: 'closed',
        head: `${ this.context.repo.owner }:${ branch }`
      });
      const isPrAlreadyExists = isPrAlreadyExistsCall.data;
      // if only 1 exists, it will always be the one
      // at the first place in the array
      const existingPR = isPrAlreadyExists[0];

      // if (isPrAlreadyExists.length === 1) {
      info(
        `ONE open PR exists for ${ branch }. Creating the second one against ${ this.options.openPrAgainstBranch }`
      );
      await this.setStatus({
        label: this.statusCheckName,
        currentStatus: StatusMessage.CREATING_PR,
        state: 'pending'
      }, pullRequest);
      const prFooter = [
        'This HOTFIX PR was created automatically from ',
        `[PR #${ existingPR.number }](${ existingPR.html_url }) `,
        `by [gitflow-hotfix](https://github.com/marketplace/actions/kibibit-gitflow-hotfix)`
      ].join('');
      const prBody = this.addPRBodyFooter(existingPR.body, prFooter);
      const createdPRCall = await this.octokit.rest.pulls.create({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        head: branch,
        base: this.options.openPrAgainstBranch,
        title: `${ this.options.titlePrefix } ${ existingPR.title }`,
        body: prBody
      });
      const createdPR = createdPRCall.data;
      await this.octokit.rest.issues.addAssignees({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        issue_number: createdPR.number,
        assignees: existingPR.user?.login ? [ existingPR.user.login ] : []
      });
      await this.octokit.rest.issues.addLabels({
        owner: this.context.repo.owner,
        issue_number: createdPR.number,
        repo: this.context.repo.repo,
        labels: [ ...this.options.sharedLabels, ...this.options.labels ]
      });
      await this.octokit.rest.issues.addLabels({
        owner: this.context.repo.owner,
        issue_number: existingPR.number,
        repo: this.context.repo.repo,
        labels: [ ...this.options.sharedLabels ]
      });

      info(`${ createdPR.head.ref } was created`);
      await this.setStatus({
        label: this.statusCheckName,
        currentStatus: StatusMessage.PR_CREATED,
        state: 'success'
      }, pullRequest);

      info(`Merging PR number: ${ createdPR.number }`);
      await this.mergePR(createdPR.number);
      // } else {
      //   info('More than 1 PR already exists. doing nothing...');
      //   await this.setStatus({
      //     label: this.statusCheckName,
      //     currentStatus: StatusMessage.ALREADY_EXISTS,
      //     state: 'success'
      //   }, pullRequest);
      // }
    } catch (error) {
      await this.setStatus({
        label: this.statusCheckName,
        currentStatus: StatusMessage.ERROR,
        state: 'error'
      }, pullRequest);
      throw error;
    }
  }

  async mergePR(pullNumber: number) {
    try {
      await this.octokit.rest.pulls.merge({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        pull_number: pullNumber
      });
      info(`Merged PR number: ${ pullNumber }`);
    } catch (error) {
      const errorMessage = (error instanceof Error ? error.message : error);
      throw new Error(`error while merging PR: ${ errorMessage }`);
    }
  }

  addPRBodyFooter(body: string | null, footer: string) {
    let prBody = body || '';
    prBody += '\n\n-----\n';
    prBody += footer;

    return prBody;
  }

  async setStatus(params: IStatusCheck, pr: { head: { sha: string } }): Promise<void> {
    try {
      await this.octokit.rest.repos.createCommitStatus({
        context: params.label,
        description: params.currentStatus,
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        sha: pr.head.sha,
        state: params.state,
        target_url: ''
      });
      info(`Updated build status: ${ params.currentStatus }`);
    } catch (error) {
      const errorMessage = (error instanceof Error ? error.message : error);
      throw new Error(`error while setting context status: ${ errorMessage }`);
    }
  }
}
