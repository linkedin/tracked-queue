# tracked-queue

<!--[![npm(https://img.shields.io/npm/v/tracked-queue.svg])](https://www.npmjs.com/package/tracked-queue)-->
[![CI](https://github.com/chriskrycho/tracked-queue/actions/workflows/CI.yml/badge.svg)](https://github.com/chriskrycho/tracked-queue/actions/workflows/CI.yml) [![Supportd TypeScript Versions](https://img.shields.io/badge/TypeScript-4.1%20%7C%204.2%20%7C%20next-3178c6)](https://github.com/chriskrycho/tracked-queue/blob/main/.github/workflows/CI.yml#L82) [![Nightly TypeScript Run](https://github.com/chriskrycho/tracked-queue/actions/workflows/Nightly%20TypeScript%20Run.yml/badge.svg)](https://github.com/chriskrycho/tracked-queue/actions/workflows/Nightly%20TypeScript%20Run.yml)

An [autotracked](https://v5.chriskrycho.com/journal/autotracking-elegant-dx-via-cutting-edge-cs/) implementation of a double-ended queue, implemented as a ring-buffer backed by a native JavaScript array.


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


### Basic example

We can start by creating a `TrackedQueue`. A queue always has a capacity: this is what distinguishes it from an array (which grows in an unbounded fashion). Here, we give it a capacity of `4`, which is enough to understand the rest of the API:

```ts
import TrackedQueue from 'tracked-queue';
let queue = new TrackedQueue<string>({ capacity: 4 });
```

Now we can fill up the queue by pushing four items into it, using the `pushBack()` method:

```ts
queue.pushBack("hello");
queue.pushBack("world");
queue.pushBack("goodnight");
queue.pushBack("moon");
```

The queue is now *full*. We can easily access the items within it:

```ts
console.log(queue.first); // "hello"
console.log(queue.last);  // "moon"
console.log(queue.at(2)); // "goodnight" -- note 0-indexing like an array!
console.log(queue.range({ from: 2, to: 3 })); // ["goodnight", "moon"]
```

We can also iterate over the whole collection, like this:

```ts
for (let s of queue) {
  console.log(s);
}
```

...and we'll see all these values printed, with an output like this:

```
hello
world
goodnight
moon
```

If we now push another item into it, the first item we pushed into it will have been removed:

```ts
queue.pushBack("adieu");
```

If we now repeated the same `for` loop, the output will instead be:

```
world
goodnight
moon
adieu
```

Likewise, `first` is now `world` and `last` is now `adieu`.

You can also `.pushFront`:

```ts
queue.pushFront("howdy!");
for (let s of queue) {
  console.log(s);
}
```


## Under the hood

This is implemented as an *autotracked ring buffer*. This particular implementation was inspired a bit by Rust's [VecDeue](http://doc.rust-lang.org/1.51.0/std/collections/vec_deque/struct.VecDeque.html) (a **vec**tor-backed **d**ouble-**e**nded **que**ue), though `TrackedQueue` has a substantially smaller API surface than `VecDeque`.

### The ring-buffer

A ring-buffer is a good choice for a queue which requires fast access to items throughout it as well as fast append. While a naïve implementation of a queue might implement it in terms of a linked list, arbitrary item access for a linked list is O(N). A ring buffer, by contrast, has O(1) access for *any* item. The cost is a small amount of overhead for tracking the first and last items in the queue, as well as O(N) costs for making the queue contigous again.

Let's see how this works. We create a queue with capacity 4:

```ts
let queue = new TrackedQueue({ capacity: 4 });
```

The result is an array in memory with cells for the capacity, each of which is *empty*.

```
+---------------+
|   |   |   |   |
+---------------+
```

In practice in JS, this means that the values in the array are `undefined`. Now we add an item to the queue:

```ts
queue.pushBack(2);
```

This puts `2` in the first slot; the others remain empty:

```
+---------------+
| 2 |   |   |   |
+---------------+
```

Each time we `pushBack` another item into the queue, it adds it to the backing storage:

```ts
queue.pushBack(4);
queue.pushBack(6);
queue.pushBack(8);
```

```
+---------------+
| 2 | 4 | 6 | 8 |
+---------------+
```

Now we're out of room! If we want to introduce another item, we have to either grow the storage, which violates our goal of having the queue have a fixed size, or we have to get rid of an existing item. Since we're pushing onto the *end* of the queue, we can get rid of the item at the *beginning*. You can think of this as though we're "pushing" it out of the back of the queue:

```ts
queue.pushBack(1);
```

```
   +---------------+
 2 | 4 | 6 | 8 | 1 |
   +---------------+
```

To do this with an actual array, though, we would need to copy each of the items backwards, like this:

```ts
let newStorage: T[] = [];
for (let i = 1; i < existingStorage.length; i++) {
  newStorage[i - 1] = existingStorage[i];
}
```

This means that the cost of adding new items when we are at capacity grows linearly with the size of the queue; it's always exactly *O(N-1)*. For four items, we have to copy 3 items; for 1,000 items we have to copy 999 items.

We can avoid this by using the backing array as a *ring* buffer, which will give us constant time (*O(1)*) access and push and pop operations. When we get to the end, we can wrap around it instead of moving the items within it. In that approach, if we have a full queue:

```
+---------------+
| 2 | 4 | 6 | 8 |
+---------------+
```

...and push into it:

```ts
queue.pushBack(1);
```

...we simply replace the item at the *start* of the "ring":

```
+---------------+
| 1 | 4 | 6 | 8 |
+---------------+
```

As we add more items, we just continue to replace the existing items in the queue:

```ts
queue.pushBack(3);
queue.pushBack(5);
```

```
+---------------+
| 1 | 3 | 5 | 8 |
+---------------+
```

This has the same effect as rearranging the queue each time, but the cost of insertion for a new element is now constant and does not change with the size of the queue.

To make this work, though, we have to introduce some bookkeeping so we know where to insert new elements. Specifically, we need to know:

- the capacity of the queue, and we have to know
- the current start of the queue
- the current end of the queue

Additionally, we also need one more slot in our backing storage, so that we can 

We already have the capacity from construction. For our cursors, we can just track the start/tail, `t`, and end/head, `h`, where `h` is always the next insertion point:

1.  ```ts
    let queue = new TrackedQueue({ capacity: 4 });
    ```

    Empty/both cursors at the first item:

    ```
    +-------------------+
    |   |   |   |   |   |
    +-------------------+
     t,h
    ```

2.  ```ts
    queue.pushBack(2);
    ```

    Single element/tail at first item, head now on the next insertion point:

    ```
    +-------------------+
    | 2 |   |   |   |   |
    +-------------------+
      t   h
    ```

3.  ```ts
    queue.pushBack(4);
    ```

    Multiple elements:

    ```
    +-------------------+
    | 2 | 4 |   |   |   |
    +-------------------+
      t       h
    ```

4.  ```ts
    queue.pushBack(6);
    ```

    Multiple elements:

    ```
    +-------------------+
    | 2 | 4 | 6 |   |   |
    +-------------------+
      t           h
    ```

5.  ```ts
    queue.pushBack(8);
    ```

    Multiple elements:

    ```
    +-------------------+
    | 2 | 4 | 6 | 8 |   |
    +-------------------+
      t               h
    ```

6.  ```ts
    queue.pushBack(1);
    ```

    Multiple elements, wrapping:

    ```
    +-------------------+
    |   | 4 | 6 | 8 | 1 |
    +-------------------+
      h   t
    ```

7.  ```ts
    queue.pushBack(3);
    ```

    Multiple elements, wrapping:

    ```
    +-------------------+
    | 3 |   | 6 | 8 | 1 |
    +-------------------+
          h   t
    ```

8.  ```ts
    let popped = queue.popFront();
    ```

    Multiple elements, wrapping:

    ```
    +-------------------+
    | 1 | 3 |   |   | 8 |
    +-------------------+
              h       t
    ```

9.  ```ts
    let popped = queue.popBack();
    ```

    Multiple elements, wrapping:

    ```
    +-------------------+
    | 1 |   |   |   | 8 |
    +-------------------+
          h           t
    ```

10. ```ts
    queue.pushStart(5);
    ```

    Multiple elements, wrapping:

    ```
    +-------------------+
    | 1 |   |   | 5 | 8 |
    +-------------------+
          h       t
    ```

11. ```ts
    queue.pushStart(7);
    ```

    Multiple elements, wrapping:

    ```
    +-------------------+
    | 1 |   | 7 | 5 | 8 |
    +-------------------+
          h   t
    ```

12. ```ts
    queue.pushStart(9);
    ```

    Multiple elements, wrapping:

    ```
    +-------------------+
    |   | 9 | 7 | 5 | 8 |
    +-------------------+
      h   t
    ```

13. ```ts
    queue.pushStart(2);
    ```

    Multiple elements, wrapping:

    ```
    +-------------------+
    | 2 | 9 | 7 | 5 |   |
    +-------------------+
      t               h
    ```

Notice that throughout, the next item to insert is always simple a function of the capacity and the current cursor position, regardless of which operation we are doing. The memory and update overhead for the cursors is constant and tiny (just a number and a single wrapping addition or subtraction operation respectively).

Read access to the array is similarly straightforward and cheap. It costs only one additional mathematical operation for access over direct array access: computing the offset from the start, using the capacity. When we want to access the third item in the queue with `queue.itemAt(someIndex)`, our backing storage can simply do `(start + someIndex) % capacity` to get the resulting index of the item.

### Adding autotracking

For the sake of using this in a Glimmer or Ember application, we want to schedule new renders whenever the queue changes. We can do this extremely cheaply: the only overhead is making the `tail` and `head` cursors `@tracked`. This lets us take advantage of the fact that the implementation *already* requires us to have these two values around for bookkeeping; it just connects that bookkeeping for the data structure to the bookkeeping for the reactivity system. This also guarantees correctness: because our bookkeeping for both is the same, if the public API works correctly, so does the reactivity layer!

## Contributing

See the [Contributing](CONTRIBUTING.md) guide for details.


## License

This project is licensed under the [MIT License](LICENSE.md).
