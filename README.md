# tracked-queue

<!--[![npm(https://img.shields.io/npm/v/tracked-queue.svg])](https://www.npmjs.com/package/tracked-queue)-->
[![CI](https://github.com/chriskrycho/tracked-queue/actions/workflows/CI.yml/badge.svg)](https://github.com/chriskrycho/tracked-queue/actions/workflows/CI.yml) [![Supportd TypeScript Versions](https://img.shields.io/badge/TypeScript-4.1%20%7C%204.2%20%7C%20next-3178c6)](https://github.com/chriskrycho/tracked-queue/blob/main/.github/workflows/CI.yml#L82) [![Nightly TypeScript Run](https://github.com/chriskrycho/tracked-queue/actions/workflows/Nightly%20TypeScript%20Run.yml/badge.svg)](https://github.com/chriskrycho/tracked-queue/actions/workflows/Nightly%20TypeScript%20Run.yml)

An [autotracked](https://v5.chriskrycho.com/journal/autotracking-elegant-dx-via-cutting-edge-cs/) implementation of a double-ended queue, implemented as a ring-buffer backed by a native JavaScript array, with optimal performance for all common operations:

- *O(1)* push and pop from either end of the queue
- *O(1)* read from any element in the queue
- *O(N)* iteration of the whole queue
- *O(N)* access to any range of size *N* within the queue
- *O(N+X)* storage for a queue of size *N*, with *X* a fixed overhead on the order of a few tens of bytes:
  - backing storage of size `N`
  - a single capacity value
  - two pointers into the storage, with the additional cost of one Glimmer "tag" for each of them

<!-- omit in toc -->
## Contents

- [Example](#example)
- [Compatibility](#compatibility)
  - [TypeScript](#typescript)
  - [Browser support](#browser-support)
- [Installation](#installation)
- [Docs](#docs)
- [Contributing](#contributing)
- [License](#license)

## Example

Create a queue of a specified capacity, and then push items into it from existing arrays or individual values:

```ts
// Create a queue with capacity 5, from an existing array of elements:
import TrackedQueue from '@linkedin/tracked-queue';
let queue = new TrackedQueue<string>({ capacity: 5 });

queue.append(["alpha", "bravo", "charlie"]);
console.log(queue.size); // 3
console.log([...queue]); // ["alpha", "bravo", "charlie"]

queue.pushBack("delta");
console.log(queue.size); // 4
console.log([...queue]); // ["alpha", "bravo", "charlie", "delta"]
```

If you append more elements to the back of the queue, exceeding its capacity, it will drop the front of the queue, with the `size` of the queue never exceeding its specified capacity, and any items removed to make room are returned. (The same goes for `prepend`, on the front of the queue.)

```ts
let pushedOut = queue.append(["echo", "foxtrot");
console.log(queue.size); // 5
console.log([...queue]); // ["bravo", "charlie", "delta", "echo", "foxtrot"]
console.log(pushedOut); // ["alpha"]
```

You can also add and remove items to and from either end of the queue:

```ts
let poppedFromBack = queue.popBack();
console.log(poppedFromBack); // "foxtrot"
console.log([...queue]); // ["bravo", "charlie", "delta", "echo"]

let poppedFromFront = queue.popFront();
console.log(poppedFromFront); // "bravo"
console.log([...queue]); // ["charlie", "delta", "echo"]

queue.pushBack("golf")
queue.pushFront("hotel")
console.log([...queue]); // ["hotel", "charlie", "delta", "echo", "golf"]
```

These also return a value which had to be popped to make room for them, if any:

```ts
let poppedByPush = queue.pushBack("india")
console.log([...queue]); // ["charlie", "delta", "echo", "golf", "india"]
console.log(poppedByPush); // "hotel"
 // make the queue non-empty
queue.popFront();
let nothingPopped = queue.pushFront("juliet")
console.log([...queue]); // ["juliet", "delta", "echo", "golf", "india"]
console.log(poppedByPush); // undefined
```

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


## Docs

- See [docs/API.md](./docs/API.md) for full API documentation.
- See [docs/under-the-hood.md](./docs/under-the-hood.md) for details on how the queue works.


## Contributing

See the [Contributing](CONTRIBUTING.md) guide for details.


## License

This project is licensed under the [MIT License](LICENSE.md).
