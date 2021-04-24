# tracked-queue

<!--[![npm(https://img.shields.io/npm/v/tracked-queue.svg])](https://www.npmjs.com/package/tracked-queue)-->
[![CI](https://github.com/chriskrycho/tracked-queue/actions/workflows/CI.yml/badge.svg)](https://github.com/chriskrycho/tracked-queue/actions/workflows/CI.yml) [![Supportd TypeScript Versions](https://img.shields.io/badge/TypeScript-4.1%20%7C%204.2%20%7C%20next-3178c6)](https://github.com/chriskrycho/tracked-queue/blob/main/.github/workflows/CI.yml#L82) [![Nightly TypeScript Run](https://github.com/chriskrycho/tracked-queue/actions/workflows/Nightly%20TypeScript%20Run.yml/badge.svg)](https://github.com/chriskrycho/tracked-queue/actions/workflows/Nightly%20TypeScript%20Run.yml)

An [autotracked](https://v5.chriskrycho.com/journal/autotracking-elegant-dx-via-cutting-edge-cs/) implementation of a ring-buffer-style queue, backed by a native (autotracked) JavaScript array.


## Compatibility

* Ember.js v3.16 or above
* Ember CLI v2.13 or above
* Node.js v12 or above

### TypeScript

This project follows the current draft of [the Semantic Versioning for TypeScript Types][semver] proposal.

* **Currently supported TypeScript versions:** v4.1 and v4.2
* **Compiler support policy:** [simple majors][sm]
* **Public API:** all published types not in a `-private` module are public

[semver]: https://github.com/chriskrycho/ember-rfcs/blob/semver-for-ts/text/0730-semver-for-ts.md
[sm]: https://github.com/chriskrycho/ember-rfcs/blob/semver-for-ts/text/0730-semver-for-ts.md#simple-majors

### Browser support

This project uses native `Proxy` (via a dependency), and so is not compatible with IE11. It supports N-1 for all other browsers.

## Installation

- With npm:

    ```sh
    npm install tracked-queue
    ```

- With yarn:

    ```sh
    yarn add tracked-queue
    ```

- With ember-cli:

    ```sh
    ember install tracked-queue
    ```


## Usage

[Longer description of how to use the addon in apps.]


## Contributing

See the [Contributing](CONTRIBUTING.md) guide for details.


## License

This project is licensed under the [MIT License](LICENSE.md).
