# Contributor Agreement

As a contributor, you represent that the code you submit is your original work or that of your employer (in which case you represent you have the right to bind your employer). By submitting code, you (and, if applicable, your employer) are licensing the submitted code to LinkedIn and the open source community subject to the BSD 2-Clause license.

# Responsible Disclosure of Security Vulnerabilities

**Do not file an issue on Github for security issues.** Please review the [guidelines for disclosure][disclosure_guidelines]. Reports should be encrypted using PGP ([public key][pubkey]) and sent to [security@linkedin.com][disclosure_email] preferably with the title "Vulnerability in Github LinkedIn/tracked-queue - &lt;short summary&gt;".

[disclosure_guidelines]: https://www.linkedin.com/help/linkedin/answer/62924
[pubkey]: https://www.linkedin.com/help/linkedin/answer/79676
[disclosure_email]: mailto:security@linkedin.com?subject=Vulnerability%20in%20Github%20LinkedIn/tracked-queue%20-%20%3Csummary%3E

# How To Contribute

Bug fixes, feature requests, and external contributions are welcome! **_However, please open an issue before opening a PR._** That will save everyone time, as it will allow us to work through any design tradeoffs, whether something is a bug or actually expected behavior, etc. _before_ you spend your time making a change.

## Installation

- `git clone @linkedin/tracked-queue`
- `cd tracked-queue`
- `yarn install`

## Linting

- `yarn lint:hbs`
- `yarn lint:eslint`
- `yarn lint:eslint --fix`

## Type checking

To check the types in the addon, run `yarn lint:tsc` or `yarn tsc --noEmit`.

## Running tests

- `ember test` – Runs the test suite on the current Ember version
- `ember test --server` – Runs the test suite in "watch mode"
- `ember try:each` (or `yarn test`) – Runs the test suite against all supported Ember and TypeScript versions

## Running the dummy application

- `ember serve`
- Visit the dummy application at [http://localhost:4200](http://localhost:4200).

For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).
