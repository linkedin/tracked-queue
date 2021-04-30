# tracked-queue

<!--[![npm(https://img.shields.io/npm/v/tracked-queue.svg])](https://www.npmjs.com/package/tracked-queue)-->
[![CI](https://github.com/chriskrycho/tracked-queue/actions/workflows/CI.yml/badge.svg)](https://github.com/chriskrycho/tracked-queue/actions/workflows/CI.yml) [![Supportd TypeScript Versions](https://img.shields.io/badge/TypeScript-4.1%20%7C%204.2%20%7C%20next-3178c6)](https://github.com/chriskrycho/tracked-queue/blob/main/.github/workflows/CI.yml#L82) [![Nightly TypeScript Run](https://github.com/chriskrycho/tracked-queue/actions/workflows/Nightly%20TypeScript%20Run.yml/badge.svg)](https://github.com/chriskrycho/tracked-queue/actions/workflows/Nightly%20TypeScript%20Run.yml)

An [autotracked](https://v5.chriskrycho.com/journal/autotracking-elegant-dx-via-cutting-edge-cs/) implementation of a double-ended queue, implemented as a ring-buffer backed by a native JavaScript array, with optimal performance for all common operations:

- *O(1)* push and pop from either end of the queue
- *O(1)n* read from any element in the queue
- *O(N)* iteration of the whole queue
- *O(N)* access to any range of size *N* within the queue
- *O(N+X)* storage for a queue of size *N*, with *X* a fixed overhead on the order of a few tens of bytes:
  - backing storage of size `N`
  - a single capacity value
  - two pointers into the storage, with the additional cost of one Glimmer "tag" for each of them

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
  ^
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
      ^-------^
```

Now we're out of room! If we want to introduce another item, we have to either grow the storage, which violates our goal of having the queue have a fixed size, or we have to get rid of an existing item. Since we're pushing onto the *end* of the queue, we can get rid of the item at the *beginning*. You can think of this as though we're "pushing" it out of the back of the queue:

```ts
queue.pushBack(1);
```

```
   +---------------+
 2 | 4 | 6 | 8 | 1 |
   +---------------+
                 ^
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
  ^
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
      ^---^
```

This has the same effect as rearranging the queue each time, but the cost of insertion for a new element is now constant and does not change with the size of the queue.

To make this work, though, we have to introduce some bookkeeping so we know where to insert new elements. Specifically, we need to know:

- the capacity of the queue, and we have to know
- the current front of the queue
- the current back of the queue

We already have the capacity from construction. For tracking the front and back of the queue, we can create two cursors: a `tail` and a `head`:

- `tail` always points to either the 0th, empty slot when the queue is empty *or* to the front of the queue
- `head` always points to the next place to insert an item, which will also be the 0th, empty slot when the queue is empty

Finally, notice that as described above, the `head` and `tail` would always overlap whenever the queue is full. That means that we would need to keep track of whether the queue is full to know whether overlapping `head` and `tail` means the queue is empty or not, which is important for knowing whether to move the `tail` when pushing to the back of the queue or not, as well as whether to pop an item from the current `tail` slot. If we give the queue's backing storage one additional slot over the capacity, then overlapping `head` and `tail` *only* happens when the queue is empty, so we get rid of that bookkeeping.

To see how this works, consider this sequence of pushes and pops on the front and back of the queue. Notice that throughout, the next item to insert is always simple a function of the capacity and the current cursor positions, regardless of which operation we are doing. Here `t` is the tail pointer and `h` is the head pointer.

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

The memory and update overhead for the cursors is constant and tiny (just a number and a single wrapping addition or subtraction operation respectively).

Read access to the array is similarly straightforward and cheap. It costs only one additional mathematical operation for access over direct array access: computing the offset from the start, using the capacity. When we want to access the third item in the queue with `queue.itemAt(someIndex)`, our backing storage can simply do `(start + someIndex) % capacity` to get the resulting index of the item.

### Adding autotracking

For the sake of using this in a Glimmer or Ember application, we want to schedule new renders whenever the queue changes. We can do this extremely cheaply: the only overhead is making the `tail` and `head` cursors `@tracked`. This lets us take advantage of the fact that the implementation *already* requires us to have these two values around for bookkeeping; it just connects that bookkeeping for the data structure to the bookkeeping for the reactivity system. This also guarantees correctness: because our bookkeeping for both is the same, if the public API works correctly, so does the reactivity layer!

If this section seems short, that's the whole point! Autotracking is a minimal-overhead system: you get smart reactivity with almost no cost.

## Contributing

See the [Contributing](CONTRIBUTING.md) guide for details.


## License

This project is licensed under the [MIT License](LICENSE.md).
