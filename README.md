<p align="center">
  <a href="https://github.com/Kibibit/gitflow-hotfix" target="blank"><img src="logo.png" width="150" ></a>
  <h2 align="center">
    @kibibit/gitflow-hotfix
  </h2>
</p>
<p align="center">
  <a href="https://github.com/Kibibit/gitflow-hotfix/releases"><img src="https://img.shields.io/github/v/release/kibibit/gitflow-hotfix?style=for-the-badge&logo=github&label=github@latest&color=2088FF"></a>
</p>
<p align="center">
  <a href="https://github.com/Kibibit/gitflow-hotfix/releases">
    <img src="https://img.shields.io/github/v/release/kibibit/gitflow-hotfix?color=2088FF&style=flat-square&logo=github&label=github@beta&include_prereleases">
  </a>
 <!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
<a href="#contributors-"><img src="https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square" alt="All Contributors"></a>
<!-- ALL-CONTRIBUTORS-BADGE:END -->
</p>
<p align="center">
  Open a second PR if branch is a hotfix

</p>
<hr>

## Usage
```yaml
name: Auto Hotfix If Needed

on:
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Auto Hotfix If Needed
        uses: Kibibit/gitflow-hotfix@v1.0.0
        with:
          token: ${{ secrets.BOT_TOKEN }}
          hotfixAgainstBranch: main
          openPrAgainstBranch: beta
```
## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):
<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="http://thatkookooguy.kibibit.io/"><img src="https://avatars3.githubusercontent.com/u/10427304?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Neil Kalman</b></sub></a><br /><a href="https://github.com/Kibibit/configit/commits?author=Thatkookooguy" title="Code">💻</a> <a href="https://github.com/Kibibit/configit/commits?author=Thatkookooguy" title="Documentation">📖</a> <a href="#design-Thatkookooguy" title="Design">🎨</a> <a href="#maintenance-Thatkookooguy" title="Maintenance">🚧</a> <a href="#infra-Thatkookooguy" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/Kibibit/configit/commits?author=Thatkookooguy" title="Tests">⚠️</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind are welcome!

<div>Logo made by <a href="https://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
<br>

## Stay in touch

- Author - [Neil Kalman](https://github.com/thatkookooguy)
- Website - [https://github.com/kibibit](https://github.com/kibibit)
- StackOverflow - [thatkookooguy](https://stackoverflow.com/users/1788884/thatkookooguy)
- Twitter - [@thatkookooguy](https://twitter.com/thatkookooguy)
- Twitter - [@kibibit_opensrc](https://twitter.com/kibibit_opensrc)