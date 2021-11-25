import * as core from '@actions/core'
import * as github from '@actions/github'

run()

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('token')
    const hotfixAgainstBranch = core.getInput('hotfixAgainstBranch')
    const openPrAgainstBranch = core.getInput('openPrAgainstBranch')
    await openPRIfHotfix(githubToken, hotfixAgainstBranch, openPrAgainstBranch)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function openPRIfHotfix(
  githubToken: string,
  hotfixAgainstBranch: string,
  openPrAgainstBranch: string
): Promise<void> {
  const pullRequest = github.context.payload.pull_request

  core.info(openPrAgainstBranch)
  core.info(hotfixAgainstBranch)

  if (!pullRequest) {
    core.debug('No pull request found')
    return
  }

  const baseBranch = pullRequest.base.ref as string

  if (baseBranch !== hotfixAgainstBranch) {
    core.debug(`Not a hotfix against ${hotfixAgainstBranch}`)
    return
  }

  const branch = pullRequest.head.ref as string
  const isHotfix = branch.startsWith('hotfix/')

  const octokit = github.getOctokit(githubToken)
  const isPrAlreadyExists = await octokit.rest.pulls.list({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    state: 'open',
    head: branch
  })

  core.info(isPrAlreadyExists.toString())

  core.setOutput('branch', branch)
  core.setOutput('isHotfix', isHotfix)
}
