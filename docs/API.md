# API Docs

- [Overview](#overview)
- [Methods](#methods)
- [Properties](#properties)
- [Iteration](#iteration)
- [TypeScript Niceties](#typescript-niceties)

## Overview

The TrackedQueue is a single data structure with the following interface:

```ts
interface TrackedQueue<T> {
  at(index: number): T | undefined;
  range(config: { from: number; to: number }): T[];
  pushBack(value: T): T | undefined;
  popBack(): T | undefined;
  pushFront(value: T): T | undefined;
  popFront(): T | undefined;
  prepend(values: T[]): T[];
  append(values: T[]): T[];
  includes(value: T): boolean;
  clear();
  map<U>(fn: (t: T) => U): TrackedQueue<U>;
  size: number;
  front: T | undefined;
  back: T | undefined;
  isEmpty: boolean;
}
```


## Methods

- **`at(index: number): T | undefined`:** Get the value at an index within the queue. Notes:

    - queues are 0-indexed: the first item is available `.at(0)` (equivalent to using `.front`)
    - if you request an item outside the bounds of the queue, always returns `undefined`

- **`range(config: { from: number; to: number }): T[];`:** Get a range of values from within the queue, inclusive of `from` and exclusive of `to`. As with `at`, the ranges are over a zero-indexed queue.

    For example, given a queue of numbers `(1, 2, 3)`:

    ```ts
    let queue = new TrackedQueue<number>({ capacity:  3 });
    queue.append([1, 2, 3]);
    queue.range({ from: 0, to: 3 }); // [1, 2, 3]
    queue.range({ from: 1, to: 2 }); // [2]
    ```

    **Throws** if `from > to`, if `from < 0`, if `from > size`, if `to < 0`, or if `to > size`

- **`pushBack(value: T): T | undefined`:** Push a new item onto the end of the queue. If pushing the item exceeds the `capacity` of the queue, the first item in the queue (`.front`) will be replaced. Returns The value at the front of the queue, if it was popped off to make room for the new item.


- **`popBack(): T | undefined`:** Remove the last item on the queue, if any.

- **`pushFront(value: T): T | undefined`:** Push a new item onto the front of the queue. If pushing the item exceeds the `capacity` of the queue, the last item in the queue (`.back`) will be replaced. Returns he value at the back of the queue, if it was popped off to make room for the new item.

- **`popFront(): T | undefined`:** Remove the first item on the queue, if any.

- **`prepend(values: T[]): T[]`:** Add a series of values to the front of the queue. Returns any entries which had to be popped off of the queue to make room for the newly-prepended values.

    **Note:** This preserves the order of the values passed in and the values popped from the queue. That is, given a queue with values `(1, 2, 3)`, executing `queue.prepend([4, 5, 6])` will result in the queue containing `(4, 5, 6)` and popped values `[1, 2, 3]`.

- **`append(values: T[]): T[]`:** Creates a new `TrackedQueue` by applying a function to each of the values in the existing `TrackedQueue`. The resulting `TrackedQueue` will have the same `size`, `front`, `back`, etc., but will not necessarily have the same layout in its backing storage.

- **`includes(value: T): boolean`:** Determines whether a queue includes a certain element. Uses object identity (`===`) for comparison. Worst case performance is *O(N)*.

- **`clear()`:** Delete all the items in the queue.

- **`map<U>(fn: (t: T) => U): TrackedQueue<U>`:** Creates a new `TrackedQueue` by applying a function to each of the values in the existing `TrackedQueue`. The resulting `TrackedQueue` will have the same `size`, `front`, `back`, etc., but will not necessarily have the same layout in its backing storage.


## Properties

- **`size: number`:** The number of items in the queue.

- **`front: T | undefined`:** The item at the front of the queue. That is:

    - the first item pushed onto the back of the queue which has not been popped by pushing onto the back of the queue, or
    - the most recent item pushed onto the front of the queue which has not been popped off by pushing onto the back of the queue

- **`back: T | undefined`:** The item at the end of the queue, that is, the item most recently pushed onto the back of the queue which has not been popped by pushing onto the front of the queue.

- **`isEmpty: boolean`:** Does the queue have any items in it?


## Iteration

The queue also uses `Symbol.iterator` with a generator function to implement iterability, so you can consume it via the spread operator `...`, can pass it to any type which accepts an iterable like `Array.from`, and can use it with `for...of`.


## TypeScript Niceties

When using this library in TypeScript, you can also use "type narrowing" to have nicer feedback via runtime checks. The exported type of `TrackedQueue<T>` is the union of two interfaces which extend from the base shape `_TrackedQueue`:

```ts
export interface EmptyQueue<T> extends _TrackedQueue<T> {
  size: 0;
  front: undefined;
  back: undefined;
  isEmpty: true;
}

export interface PopulatedQueue<T> extends _TrackedQueue<T> {
  size: number;
  front: T;
  back: T;
  isEmpty: false;
}

export type TrackedQueue<T> = EmptyQueue<T> | PopulatedQueue<T>;
```

This means that if you check that `isEmpty` is `true`, TypeScript will correctly indicate that `front` and `back` will never be `undefined`, eliminating redundant runtime checks or needless casts.
