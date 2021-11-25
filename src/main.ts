import * as core from '@actions/core'
import {context, getOctokit} from '@actions/github'

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
  const pullRequest = context.payload.pull_request

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

  const octokit = getOctokit(githubToken)
  const isPrAlreadyExistsCall = await octokit.rest.pulls.list({
    owner: context.repo.owner,
    repo: context.repo.repo,
    state: 'open',
    head: branch
  })
  const isPrAlreadyExists = isPrAlreadyExistsCall.data

  if (isPrAlreadyExists.length === 1) {
    core.info(`ONE PR exists for ${branch}. Creating the second one...`)
    // only one exists, this should be the right one!
    const existingPR = isPrAlreadyExists[0]
    const createdPR = await octokit.rest.pulls.create({
      owner: context.repo.owner,
      repo: context.repo.repo,
      head: branch,
      base: openPrAgainstBranch,
      title: `[AUTO]${existingPR.title}`,
      body: existingPR.body as string
    })

    core.info(JSON.stringify(createdPR, null, 2))
  }

  core.setOutput('branch', branch)
  core.setOutput('isHotfix', isHotfix)
}
