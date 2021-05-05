import { tracked } from '@glimmer/tracking';

function assert(desc: string): never;
function assert(desc: string, pred: unknown): asserts pred;
function assert(desc: string, pred?: unknown): asserts pred {
  if (!pred) {
    throw new Error(`TrackedQueue: ${desc}`);
  }
}

class TrackedQueueError extends Error {
  constructor(message: string) {
    super(`TrackedQueue: ${message}`);
  }
}

interface Config {
  capacity: number;
}

/**
  A very lightweight internal-only data structure so that we can distinguish
  between the cases where the value in the queue is `undefined` and where there
  was no value in the queue. (:sigh: at JavaScript)
 */
type Maybe<T> = ['just', T] | ['nothing', undefined];

/**
  Notes on the implementation:

  1.  This class is the *implementation* of the type, but to support narrowing,
      the exports are merged type- and value- exports at the bottom of the file.
  2.  The contents of the class are laid out in roughly the following order:
      - class fields for managing the state of the queue
      - the constructor and static constructor
      - getters and methods for information derived from the state of the queue
      - methods for updating the state of the queue
      - operator methods for generating new queues
      - internal utilities
 */
class _TrackedQueue<T> {
  /** The backing storage for the queue. */
  private _queue: Array<T | undefined>;

  /** The capacity of the queue. */
  private _cap: number;

  /** Pointer to the next point to write into the queue. */
  @tracked private _head = 0;

  /** Pointer to the start of the queue. */
  @tracked private _tail = 0;

  constructor({ capacity }: Config) {
    if (this.constructor !== _TrackedQueue) {
      assert('cannot be subclassed');
    }

    if (capacity < 1) {
      assert('requires a capacity >= 1');
    }

    // The storage has one extra slot in it so that once we are pushing items on
    // either end, the head and tail are never overlapping.
    this._cap = capacity + 1;
    this._queue = Array.from({ length: this._cap });
  }

  /**
    Create a new `TrackedQueue` from an existing array. The original array is
    unchanged.

    @param array The array of values with which to initialize the queue.
    @returns a `TrackedQueue` of the same capacity as the original array, with
      its items in the same order as in the original array
   */
  static of<A>(array: Array<A>): TrackedQueue<A> {
    const queue = new TrackedQueue<A>({ capacity: array.length });
    for (const a of array) {
      queue.pushBack(a);
    }
    return queue;
  }

  /** The number of items in the queue. */
  get size(): number {
    const { _head: head, _tail: tail } = this;
    if (head == tail) {
      return 0;
    } else if (head > tail) {
      return head - tail;
    } else if (head < tail) {
      return head + (this._cap - tail);
    } else {
      assert('unreachable');
    }
  }

  /**
    The item at the front of the queue. That is:

    - the first item pushed onto the back of the queue which has not been popped
      by pushing onto the back of the queue, or
    - the most recent item pushed onto the front of the queue which has not been
      popped off by pushing onto the back of the queue
   */
  get front(): T | undefined {
    return this.at(0);
  }

  /**
    The item at the end of the queue, that is, the item most recently pushed
    onto the back of the queue which has not been popped by pushing onto the
    front of the queue.
   */
  get back(): T | undefined {
    return this.at(this._wrappingSub(this.size, 1));
  }

  /** Does the queue have any items in it? */
  get isEmpty(): boolean {
    return this.size === 0;
  }

  // Creating a `Symbol.iterator` generator allows consumers to treat the
  // `TrackedQueue` as an iterable, natively using `for...of` and using template
  // constructs like `#each`. It also allows a trivial implementation of `map`.
  *[Symbol.iterator](): Generator<T, undefined> {
    for (let index = 0; index < this.size; index++) {
      yield this.at(index) as T;
    }

    return undefined;
  }

  /**
    Get the value at an index within the queue.

    Notes:

    - queues are 0-indexed: the first item is available `.at(0)` (equivalent to
      using `.front`)
    - if you request an item outside the bounds of the queue, always returns
      `undefined`
   */
  at(index: number): T | undefined {
    return index < this.size
      ? this._queue[(this._tail + index) % this._cap]
      : undefined;
  }

  /**
    Get a range of values from within the queue, inclusive of `from` and
    exclusive of `to`. As with `at`, the ranges are over a zero-indexed queue.

    Given a queue of numbers `(1, 2, 3)`:

    ```ts
    let queue = new TrackedQueue<number>({ capacity:  3 });
    queue.append([1, 2, 3]);
    queue.range({ from: 0, to: 3 }); // [1, 2, 3]
    queue.range({ from: 1, to: 2 }); // [2]
    ```

    @throws if `from > to`, if `from < 0`, if `from > size`, if `to < 0`, or if
      `to > size`
   */
  range({ from, to }: { from: number; to: number }): T[] {
    if (this.isEmpty)
      throw new TrackedQueueError(
        'range: cannot get a range when the queue is empty'
      );
    if (from > to)
      throw new TrackedQueueError(
        `range: 'from' must be less than 'to', but 'from' was ${from} and 'to' was ${to}`
      );
    if (from < 0 || from >= this.size)
      throw new TrackedQueueError(
        `range: 'from' must be in 0 < ${this.size}, but was ${from}`
      );
    if (to < 1 || to > this.size)
      throw new TrackedQueueError(
        `range: 'to' must be in 1 <= ${this.size}, but was ${to}`
      );

    const result: T[] = [];
    for (let i = from; i < to; i++) {
      // SAFETY: we know these are in range because of the assertion just above
      // the loop. If we were out of range, one of the assertions would throw.
      result.push(this.at(i) as T);
    }

    return result;
  }

  /**
    Determines whether a queue includes a certain element. Uses object identity
    (`===`) for comparison.

    @param value The value to search for.
    @note Worst case performance is *O(N)*.
   */
  includes(value: T) {
    // This is likely somewhat slower than using `this._queue.includes`, because
    // it has to actually consume the values via the generator, and cannot take
    // advantage of the optimizations available to the native array
    // implementation. We cannot use `this._queue.includes` if we want
    // `TrackedQueue` to support having `undefined` as an item, though. While
    // this is *extremely weird*, it is just how JavaScript and TypeScript work.
    // :sad, sad shrug: However, by using the loop, we will often find the item
    // much faster than that worst case scenario.
    for (const valInQueue of this) {
      if (valInQueue === value) {
        return true;
      }
    }

    return false;
  }

  /**
    Push a new item onto the end of the queue. If pushing the item exceeds the
    `capacity` of the queue, the first item in the queue (`.front`) will be
    replaced.

    @param value The value to add to the queue
    @returns The value at the front of the queue, if it was popped off to make
      room for the new item.
   */
  pushBack(value: T): T | undefined {
    return this._pushBack(value)[1];
  }

  // Implementation of `pushBack` which can be used safely internally: returns a
  // `Maybe<T>` so that the backing storage can be "cleared" when an element is
  // remove by setting that slot to `undefined`, but distinguishing between a
  // slot in a queue where `T` includes `undefined` (e.g. `string | undefined`)
  // and a slot which is actually *empty*.
  private _pushBack(value: T): Maybe<T> {
    const { _head: head, _tail: tail } = this;

    const nextHead = this._wrappingAdd(head, 1);
    this._queue[head] = value;
    this._head = nextHead;

    let popped: Maybe<T>;
    if (nextHead === tail) {
      // SAFETY: we know that in this scenario, the `nextHead` equals the `tail`
      // because the queue is *wrapping*. That means that we are displacing an
      // item which has been set in the backing storage previously, which in
      // turn means we can know that the cast `as T` is safe.
      popped = ['just', this._queue[tail] as T];
      this._queue[tail] = undefined;
      const nextTail = this._wrappingAdd(tail, 1);
      this._tail = nextTail;
    } else {
      popped = ['nothing', undefined];
    }

    return popped;
  }

  /**
    Push a new item onto the front of the queue. If pushing the item exceeds the
    `capacity` of the queue, the last item in the queue (`.back`) will be
    replaced.

    @param value The value to add to the queue
    @returns The value at the back of the queue, if it was popped off to make
      room for the new item.
   */
  pushFront(value: T): T | undefined {
    return this._pushFront(value)[1];
  }

  // Implementation of `pushFront` which can be used safely internally: returns
  // a `Maybe<T>` so that the backing storage can be "cleared" when an element
  // is remove by setting that slot to `undefined`, but distinguishing between a
  // slot in a queue where `T` includes `undefined` (e.g. `string | undefined`)
  // and a slot which is actually *empty*.
  private _pushFront(value: T): Maybe<T> {
    const head = this._head;
    const nextTail = this._wrappingSub(this._tail, 1);

    let popped: Maybe<T>;
    if (nextTail === head) {
      const nextHead = this._wrappingSub(head, 1);
      // SAFETY: we know that in this scenario, the `nextTail` equals the `head`
      // because the queue is *wrapping*. That means that we are displacing an
      // item which has been set in the backing storage previously, which in
      // turn means we can know that the cast `as T` is safe.
      popped = ['just', this._queue[nextHead] as T];
      this._queue[nextHead] = undefined;
      this._head = nextHead;
    } else {
      popped = ['nothing', undefined];
    }

    this._queue[nextTail] = value;
    this._tail = nextTail;

    return popped;
  }

  /** Remove the last item on the queue, if any. */
  popBack(): T | undefined {
    if (this.size === 0) {
      return undefined;
    }

    const head = this._head;
    const nextHead = this._wrappingSub(head, 1);

    const popped = this.back;
    this._queue[head] = undefined;
    this._head = nextHead;
    return popped;
  }

  /** Remove the first item on the queue, if any. */
  popFront(): T | undefined {
    if (this.size === 0) {
      return undefined;
    }

    const { _tail } = this;
    const nextTail = this._wrappingAdd(_tail, 1);

    const popped = this.front;
    this._queue[_tail] = undefined;
    this._tail = nextTail;
    return popped;
  }

  /**
    Add a series of values to the back of the queue.

    @param values the new entries to add to the queue
    @returns any entries which had to be popped off of the queue
   */
  append(values: T[]): T[] {
    const popped: T[] = [];
    for (const value of values) {
      const _popped = this._pushBack(value);
      if (_popped[0] === 'just') {
        popped.push(_popped[1]);
      }
    }
    return popped;
  }

  /**
    Add a series of values to the front of the queue.

    @param values the new entries to add to the queue
    @returns any entries which had to be popped off of the queue to make room
      for the newly-prepended values.
    @note This preserves the order of the values passed in and the values popped
      from the queue. That is, given a queue with values `(1, 2, 3)`, executing
      `queue.prepend([4, 5, 6])` will result in the queue containing `(4, 5, 6)`
      and popped values `[1, 2, 3]`.
   */
  prepend(values: T[]): T[] {
    const popped: T[] = [];
    for (let i = values.length - 1; i >= 0; i--) {
      // SAFETY: the cast `as T` is safe because we are iterating values within
      // the array `T[]`. This would be safer to do with `for...of`, as in
      // `append`, but we cannot do that on the reverse of an array, and
      // calling `.reverse()` would trigger a needless *O(N)* operation.
      const value = this._pushFront(values[i] as T);
      if (value[0] === 'just') {
        popped.unshift(value[1]);
      }
    }
    return popped;
  }

  /**
    Creates a new `TrackedQueue` by applying a function to each of the values in
    the existing `TrackedQueue`.

    The resulting `TrackedQueue` will have the same `size`, `front`, `back`,
    etc., but will not necessarily have the same layout in its backing storage.

    @param fn A function accepting a value from the `TrackedQueue` and producing
      a new value.
   */
  map<U>(fn: (t: T) => U): TrackedQueue<U> {
    const result = new TrackedQueue<U>({ capacity: this._cap - 1 });
    for (const a of this) {
      result.pushBack(fn(a));
    }
    return result;
  }

  /** Delete all the items in the queue. */
  clear() {
    this._queue = Array.from({ length: this._cap });
    this._head = 0;
    this._tail = 0;
  }

  /**
    Get a string representation of the queue.

    For a queue of numbers with the values (1, 2, 3), the resulting string will
    be `TrackedQueue(1, 2, 3)`. The representation of the items within the queue
    is naive, and will simply be whatever their own `toString` produces.

    @warning Since the result includes all items within the queue, the resulting
      string may be very long.
   */
  toString(): string {
    return `TrackedQueue(${[...this].join(', ')})`;
  }

  private _wrappingAdd(initial: number, addend: number) {
    return (initial + addend) % this._cap;
  }

  private _wrappingSub(initial: number, subtrahend: number) {
    const basicResult = initial - subtrahend;
    // `+` not `-` when interacting with `max` because `result` is negative!
    const newValue = basicResult < 0 ? this._cap + basicResult : basicResult;
    return newValue % this._cap;
  }
}

// These two types allow us to narrow effectively: when the queue is empty, we
// *also* know that `front` and `back` are `undefined` and that the `size` is
// `0` -- and vice versa: when the tag is any *other* tag, we know that `front`
// and `back` are of type `T` (that is: are *never* `undefined`).
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

// Combined with the assignment and type cast below, this allows us to teach
// TypeScript that, for its purposes, the class returns a `TrackedQueue` from
// its default and static constructor.
export interface TrackedQueueConstructor {
  new <T>({ capacity }: Config): TrackedQueue<T>;
  of: <T>(as: T[]) => TrackedQueue<T>;
}

/**
  An autotracked ring-buffer-backed queue with `O(1)` insertion, deletion, and
  access, and `O(N)` reordering.
 */
export type TrackedQueue<T> = EmptyQueue<T> | PopulatedQueue<T>;
export const TrackedQueue = _TrackedQueue as TrackedQueueConstructor;
export default TrackedQueue;
