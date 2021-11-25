import * as core from '@actions/core'
import github from '@actions/github'
import {wait} from './wait'

run()

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('token')
    await openPRIfHotfix(githubToken)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function openPRIfHotfix(githubToken: string): Promise<void> {
  const pullRequest = github.context.payload.pull_request

  if (!pullRequest) {
    core.debug('No pull request found')
    return
  }

  const baseBranch = pullRequest.base.ref as string
  const branch = pullRequest.head.ref as string
  const isHotfix = branch.startsWith('hotfix/')

  const octokit = github.getOctokit(githubToken)
  const isPrAlreadyExists = await octokit.rest.pulls.list({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    state: 'open',
    head: branch,
    base: baseBranch
  })

  core.info(isPrAlreadyExists.toString())

  core.setOutput('branch', branch)
  core.setOutput('isHotfix', isHotfix)
}
