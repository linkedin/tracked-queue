import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import TrackedQueue from 'tracked-queue';
import { expectTypeOf } from 'expect-type';
import { render, settled as rerender } from '@ember/test-helpers';
import type { TestContext as BaseContext } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupRenderingTest } from 'ember-qunit';
import Component from '@glimmer/component';
import { setComponentTemplate } from '@ember/component';

declare module '@ember/component' {
  function setComponentTemplate<T>(template: ReturnType<typeof hbs>, obj: T): T;
}

module('TrackedQueue', function () {
  module('unit', function (hooks) {
    setupTest(hooks);

    expectTypeOf<TrackedQueue<unknown>>().not.toHaveProperty('_pushBack');
    expectTypeOf<TrackedQueue<unknown>>().not.toHaveProperty('_popBack');
    expectTypeOf<TrackedQueue<unknown>>().not.toHaveProperty('_head');
    expectTypeOf<TrackedQueue<unknown>>().not.toHaveProperty('_tail');
    expectTypeOf<TrackedQueue<unknown>>().not.toHaveProperty('_queue');
    expectTypeOf<TrackedQueue<unknown>>().not.toHaveProperty('_cap');

    test('constructor', function (assert) {
      expectTypeOf(TrackedQueue).toBeConstructibleWith({ capacity: 12 });
      expectTypeOf(TrackedQueue).constructorParameters.toEqualTypeOf<
        [config: { capacity: number }]
      >();

      const queue = new TrackedQueue<string>({ capacity: 10 });
      assert.ok(queue);
      expectTypeOf(queue.size).toEqualTypeOf<number>();
      expectTypeOf(queue.front).toEqualTypeOf<string | undefined>();
      expectTypeOf(queue.back).toEqualTypeOf<string | undefined>();

      assert.throws(
        () => new TrackedQueue({ capacity: 0 }),
        'requires a capacity >= 1'
      );
      // @ts-expect-error -- testing illegitimate JS call!
      assert.throws(() => new TrackedQueue(), 'requires capacity');

      // @ts-expect-error -- this is not subclassable; the point here is to
      // confirm that throwing has the expected developer experience for JS
      // consumers, who will not have the type error.
      class Subclass extends TrackedQueue<unknown> {}
      assert.throws(
        () => new Subclass({ capacity: 10 }),
        'cannot be subclassed'
      );
    });

    test('static `of` constructor', function (assert) {
      expectTypeOf(TrackedQueue.of).parameters.toEqualTypeOf<[unknown[]]>();
      const orig = [1, 2, 3, 4];
      const queue = TrackedQueue.of(orig);
      assert.equal(queue.size, orig.length);
    });

    module('`.pushBack()`', function () {
      test('when the queue is not full', function (assert) {
        expectTypeOf<
          TrackedQueue<number>['pushBack']
        >().parameters.toEqualTypeOf<[value: number]>();

        const queue = new TrackedQueue<number>({ capacity: 10 });

        const popped1 = queue.pushBack(1);
        assert.equal(queue.size, 1, 'after one `.push`, there is one item');
        assert.equal(queue.front, 1, '`front` has the first value');
        assert.equal(queue.back, 1, '`back` has the first value');
        assert.equal(popped1, undefined, 'no item is popped');
        expectTypeOf(popped1).toEqualTypeOf<number | undefined>();

        const popped2 = queue.pushBack(10);
        assert.equal(
          queue.size,
          2,
          'after another `.push`, there are two items'
        );
        assert.equal(queue.front, 1, '`front` still has the first value');
        assert.equal(queue.back, 10, '`back` has the second value');
        assert.equal(popped2, undefined, 'no item is popped');
        expectTypeOf(popped2).toEqualTypeOf<number | undefined>();
      });

      test('when the queue is full', function (assert) {
        const capacity = 4;
        const queue = new TrackedQueue({ capacity });
        const first = 1;
        queue.pushBack(first);
        const second = 2;
        queue.pushBack(second);
        queue.pushBack(3);
        queue.pushBack(4);

        const latest = 5;
        const popped = queue.pushBack(latest);
        assert.equal(
          queue.size,
          capacity,
          'calling pushBack does not increase the size'
        );
        assert.equal(queue.front, second, '`front` now has the second value');
        assert.equal(queue.back, latest, '`back` has the latest value');
        assert.equal(popped, first, 'the first value is returned');
      });

      test('when the capacity is 1', function (assert) {
        const queue = new TrackedQueue<string>({ capacity: 1 });

        const first = 'hello';
        queue.pushBack('hello');
        const second = 'goodbye';
        const popped = queue.pushBack(second);
        assert.equal(queue.size, 1, 'it remains size 1');
        assert.equal(queue.front, second, '`front` is the new value');
        assert.equal(queue.back, second, '`front` is the new value');
        assert.equal(popped, first, 'the first element is popped immediately');
      });
    });

    module('`.popBack()`', function () {
      test('when the queue is empty', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        assert.equal(queue.size, 0, 'initial size is 0');

        const returnValue = queue.popBack();
        assert.equal(queue.size, 0, 'it is still empty after .popBack');
        assert.equal(queue.front, undefined, '`front` is undefined');
        assert.equal(queue.back, undefined, '`back` is undefined');
        expectTypeOf(returnValue).toEqualTypeOf<number | undefined>();
      });

      test('when the queue has a single item in it', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        const value = 42;
        queue.pushBack(42);

        const returned = queue.popBack();
        assert.equal(queue.size, 0, 'the queue is empty after .popBack');
        assert.equal(queue.front, undefined, '`front` is undefined');
        assert.equal(queue.back, undefined, '`back` is undefined');
        assert.equal(
          returned,
          value,
          'the returned value was the pushed value'
        );
        expectTypeOf(returned).toEqualTypeOf<number | undefined>();
      });

      test('when the queue has more than one item in it', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        const first = 10;
        const second = 20;
        const third = 30;

        queue.pushBack(first);
        queue.pushBack(second);
        queue.pushBack(third);

        const firstPopped = queue.popBack();
        assert.equal(firstPopped, third, 'the first popped is the last pushed');
        assert.equal(queue.size, 2, '`size` is 2');
        assert.equal(queue.front, first, '`front` is still the first pushed');
        assert.equal(queue.back, second, '`back` is the second pushed');

        const secondPopped = queue.popBack();
        assert.equal(
          secondPopped,
          second,
          'the first popped is the second pushed'
        );
        assert.equal(queue.size, 1, '`size` is 1');
        assert.equal(queue.front, first, '`front` is still the first pushed');
        assert.equal(queue.back, first, '`back` is the first pushed');

        const thirdPopped = queue.popBack();
        assert.equal(thirdPopped, first, 'the last popped is the first pushed');
        assert.equal(queue.size, 0, '`size` is 0');
        assert.equal(queue.front, undefined, '`front` is undefined');
        assert.equal(queue.back, undefined, '`back` is undefined');
      });

      test('when the queue has wrapped', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 4 });
        queue.pushBack(0); // [0, _, _, _]
        queue.pushBack(1); // [0, 1, _, _]
        queue.pushBack(2); // [0, 1, 2, _]
        queue.pushBack(3); // [0, 1, 2, 3]
        queue.pushBack(4); // [4, 1, 2, 3]
        queue.pushBack(5); // [4, 5, 2, 3]

        const firstPopped = queue.popBack(); // [4, _, 2, 3]
        assert.equal(firstPopped, 5, 'first popped is last pushed');
        assert.equal(queue.size, 3, '`size` decreased to 3');
        assert.equal(queue.front, 2, '`front` is unchanged after popBack');
        assert.equal(queue.back, 4, '`back` is correct after pop');

        const secondPopped = queue.popBack(); // [_, _, 2, 3]
        assert.equal(secondPopped, 4, 'second popped is correct');
        assert.equal(queue.size, 2, '`size` decreased to 2');
        assert.equal(queue.front, 2, '`front` is unchanged after popBack');
        assert.equal(queue.back, 3, '`back` is correct after pop');

        const thirdPopped = queue.popBack(); // [_, _, 2, _]
        assert.equal(thirdPopped, 3, 'third popped is correct');
        assert.equal(queue.size, 1, '`size` decreased to 2');
        assert.equal(queue.front, 2, '`front` is unchanged after popBack');
        assert.equal(queue.back, 2, '`back` is correct after pop');
      });
    });

    module('`.pushFront()`', function () {
      test('when the queue is not full', function (assert) {
        expectTypeOf<
          TrackedQueue<number>['pushFront']
        >().parameters.toEqualTypeOf<[value: number]>();

        const queue = new TrackedQueue<number>({ capacity: 10 });

        const popped1 = queue.pushFront(1);
        assert.equal(queue.size, 1, 'after one `.push`, there is one item');
        assert.equal(queue.front, 1, '`front` has the first value');
        assert.equal(queue.back, 1, '`back` has the first value');
        assert.equal(popped1, undefined, 'no item is popped');
        expectTypeOf(popped1).toEqualTypeOf<number | undefined>();

        const popped2 = queue.pushFront(10);
        assert.equal(
          queue.size,
          2,
          'after another `.push`, there are two items'
        );
        assert.equal(queue.front, 10, '`front` has the second value');
        assert.equal(queue.back, 1, '`back` still has the first value');
        assert.equal(popped2, undefined, 'no item is popped');
        expectTypeOf(popped2).toEqualTypeOf<number | undefined>();
      });

      test('when the queue is full', function (assert) {
        const capacity = 4;
        const queue = new TrackedQueue({ capacity });
        const first = 1;
        queue.pushFront(first);
        const second = 2;
        queue.pushFront(second);
        queue.pushFront(3);
        queue.pushFront(4);

        const latest = 5;
        const popped = queue.pushFront(latest);
        assert.equal(
          queue.size,
          capacity,
          'calling pushFront does not increase the size'
        );
        assert.equal(queue.front, latest, '`front` now has the latest value');
        assert.equal(queue.back, second, '`back` has the second value');
        assert.equal(popped, first, 'the first value is returned');
      });

      test('when the capacity is 1', function (assert) {
        const queue = new TrackedQueue<string>({ capacity: 1 });

        const first = 'hello';
        queue.pushFront('hello');
        const second = 'goodbye';
        const popped = queue.pushFront(second);
        assert.equal(queue.size, 1, 'it remains size 1');
        assert.equal(queue.front, second, '`front` is the new value');
        assert.equal(queue.back, second, '`front` is the new value');
        assert.equal(popped, first, 'the first element is popped immediately');
      });
    });

    module('`.popFront()`', function () {
      test('when the queue is empty', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        assert.equal(queue.size, 0, 'initial size is 0');

        const returnValue = queue.popFront();
        assert.equal(queue.size, 0, 'it is still empty after .popFront');
        assert.equal(queue.front, undefined, '`front` is undefined');
        assert.equal(queue.back, undefined, '`back` is undefined');
        expectTypeOf(returnValue).toEqualTypeOf<number | undefined>();
      });

      test('when the queue has a single item in it', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        const value = 42;
        queue.pushBack(42);

        const returned = queue.popFront();
        assert.equal(queue.size, 0, 'the queue is empty after .popFront');
        assert.equal(queue.front, undefined, '`front` is undefined');
        assert.equal(queue.back, undefined, '`back` is undefined');
        assert.equal(
          returned,
          value,
          'the returned value was the pushed value'
        );
        expectTypeOf(returned).toEqualTypeOf<number | undefined>();
      });

      test('when the queue has more than one item in it', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        const first = 10;
        const second = 20;
        const third = 30;

        queue.pushBack(first);
        queue.pushBack(second);
        queue.pushBack(third);

        const firstPopped = queue.popFront();
        assert.equal(
          firstPopped,
          first,
          'the first popped is the first pushed'
        );
        assert.equal(queue.size, 2, '`size` is 2');
        assert.equal(queue.front, second, '`front` is the second pushed');
        assert.equal(queue.back, third, '`back` is still the third pushed');

        const secondPopped = queue.popFront();
        assert.equal(
          secondPopped,
          second,
          'the first popped is the second pushed'
        );
        assert.equal(queue.size, 1, '`size` is 1');
        assert.equal(queue.front, third, '`front` is now the third pushed');
        assert.equal(queue.back, third, '`back` is still the third pushed');

        const thirdPopped = queue.popFront();
        assert.equal(thirdPopped, third, 'the last popped is the first pushed');
        assert.equal(queue.size, 0, '`size` is 0');
        assert.equal(queue.front, undefined, '`front` is undefined');
        assert.equal(queue.back, undefined, '`back` is undefined');
      });

      test('when the queue has wrapped', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 4 });
        queue.pushBack(0); // [0, _, _, _]
        queue.pushBack(1); // [0, 1, _, _]
        queue.pushBack(2); // [0, 1, 2, _]
        queue.pushBack(3); // [0, 1, 2, 3]
        queue.pushBack(4); // [4, 1, 2, 3]
        queue.pushBack(5); // [4, 5, 2, 3]

        const firstPopped = queue.popFront(); // [4, 5, _, 3]
        assert.equal(firstPopped, 2, 'first popped is first remaining pushed');
        assert.equal(queue.size, 3, '`size` decreased to 3');
        assert.equal(queue.front, 3, '`front` is correct after popFront');
        assert.equal(queue.back, 5, '`back` is correct after pop');

        const secondPopped = queue.popFront(); // [4, 5, _, _]
        assert.equal(secondPopped, 3, 'second popped is correct');
        assert.equal(queue.size, 2, '`size` decreased to 2');
        assert.equal(queue.front, 4, '`front` is correct after popFront');
        assert.equal(queue.back, 5, '`back` is correct after pop');

        const thirdPopped = queue.popFront(); // [_, 5, _, _]
        assert.equal(thirdPopped, 4, 'third popped is correct');
        assert.equal(queue.size, 1, '`size` decreased to 2');
        assert.equal(queue.front, 5, '`front` is correct after popFront');
        assert.equal(queue.back, 5, '`back` is correct after pop');
      });
    });

    module('`.at()`', function () {
      test('when the queue is empty', function (assert) {
        const capacity = 10;
        const queue = new TrackedQueue<number>({ capacity });

        for (let n = 0; n < capacity; n++) {
          assert.equal(
            queue.at(n),
            undefined,
            `\`queue.at(${n})\` is \`undefined\``
          );
        }

        assert.equal(
          queue.at(capacity),
          undefined,
          '`queue.at(capacity)` is `undefined`'
        );

        assert.equal(
          queue.at(capacity * 100),
          undefined,
          '`queue.at(capacity * 100)` is `undefined`'
        );
      });

      test('when the queue is not full', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        const first = 10;
        queue.pushBack(10);
        assert.equal(
          queue.at(0),
          first,
          'after pushing one item, the first entry matches it'
        );
        assert.equal(queue.at(1), undefined, 'but the second entry is empty');
        assert.equal(queue.at(2), undefined, 'as is the third entry');

        const second = 20;
        queue.pushBack(20);

        assert.equal(
          queue.at(0),
          first,
          'after pushing another item, the first entry is unchanged'
        );
        assert.equal(
          queue.at(1),
          second,
          'the second entry nwo matches the second item pushed'
        );
        assert.equal(
          queue.at(2),
          undefined,
          'and the third entry remains empty'
        );
      });

      test('when the queue has wrapped', function (assert) {
        const capacity = 3;
        const queue = new TrackedQueue<number>({ capacity });

        const values = Array.from({ length: capacity + 1 }, (_, i) => i * 2);
        values.forEach((value) => queue.pushBack(value));

        for (let i = 0; i < capacity; i++) {
          assert.equal(
            queue.at(i),
            values[i + 1],
            `the ${i}th entry is correct`
          );
        }
      });
    });

    module('iteration', function () {
      test('when the queue is empty', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        const yielded = [...queue];
        assert.ok(true, 'invoking the iterator via `...` does not throw');
        assert.equal(yielded.length, 0, 'the result has a length of 0');
        expectTypeOf(yielded).toEqualTypeOf<number[]>();
      });

      test('when the queue is full', function (assert) {
        const data = Array.from({ length: 10 }, (_, i) => i);
        assert.expect(31);

        const queue = TrackedQueue.of(data);
        for (const val of queue) {
          assert.true(typeof val === 'number', `${val} is yielded`);
          assert.true(data.includes(val));
        }

        const yielded = [...queue];
        assert.equal(
          yielded.length,
          data.length,
          'yielded data has the same length'
        );

        for (const val of yielded) {
          assert.true(data.includes(val));
        }
      });

      test('when the queue wraps', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 3 });
        queue.pushBack(1);
        queue.pushBack(2);
        queue.pushBack(3);
        queue.pushBack(4);
        const yielded = [...queue];
        assert.equal(yielded.length, 3, 'the yielded size is correct');
        assert.equal(yielded[0], 2, 'the 0th item is correct');
        assert.equal(yielded[1], 3, 'the 1st item is correct');
        assert.equal(yielded[2], 4, 'the 2nd item is correct');
      });
    });

    module('`.map()`', function () {
      test('when the queue is empty', function (assert) {
        const orig = new TrackedQueue<string>({ capacity: 10 });
        const mapped = orig.map((s) => s.length);
        expectTypeOf(mapped).toEqualTypeOf<TrackedQueue<number>>();
        assert.equal(mapped.size, 0);
      });

      test('when the queue is full', function (assert) {
        const capacity = 4;
        const queue = new TrackedQueue<number>({ capacity });
        queue.pushBack(1);
        queue.pushBack(2);
        queue.pushBack(3);
        queue.pushBack(4);

        const newQueue = queue.map((n) => n > 2);
        assert.equal(newQueue.size, capacity, 'the new queue is the same size');
        assert.false(newQueue.at(0), 'the first item is `false`');
        assert.false(newQueue.at(1), 'the second item is `false`');
        assert.true(newQueue.at(2), 'the third item is `true`');
        assert.true(newQueue.at(3), 'the fourth item is `true`');
        expectTypeOf(newQueue).toEqualTypeOf<TrackedQueue<boolean>>();
      });

      test('when the queue wraps', function (assert) {
        const capacity = 3;
        const queue = new TrackedQueue<number>({ capacity });
        queue.pushBack(1);
        queue.pushBack(2);
        queue.pushBack(3);
        queue.pushBack(4);

        const newQueue = queue.map((n) => n * 2);
        assert.equal(newQueue.size, capacity, 'the new queue is the same size');
        assert.equal(newQueue.at(0), 4, 'the first item is `4`');
        assert.equal(newQueue.at(1), 6, 'the second item is `6`');
        assert.equal(newQueue.at(2), 8, 'the third item is `8`');
        expectTypeOf(newQueue).toEqualTypeOf<TrackedQueue<number>>();
      });
    });

    module('`.range()', function () {
      test('when the queue is empty', function (assert) {
        const queue = new TrackedQueue({ capacity: 10 });
        assert.throws(
          () => queue.range({ from: 1, to: 3 }),
          (error: Error) =>
            error.message ===
            'TrackedQueue: range: cannot get a range when the queue is empty',
          'cannot get a range when the queue is empty'
        );
      });

      test('when the range has a single item', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        queue.pushBack(1);
        assert.deepEqual(
          queue.range({ from: 0, to: 1 }),
          [1],
          'a range from 0 to 1 is allowed'
        );

        assert.throws(
          () => queue.range({ from: 0, to: 2 }),
          (error: Error) =>
            error.message ===
            "TrackedQueue: range: 'to' must be in 1 <= 1, but was 2",
          'a range from 0 to n > 1 throws'
        );

        assert.throws(
          () => queue.range({ from: 1, to: 0 }),
          (error: Error) =>
            error.message ===
            "TrackedQueue: range: 'from' must be less than 'to', but 'from' was 1 and 'to' was 0",
          'a range with `from` > `to` throws'
        );
      });

      test('when the range is full', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 4 });
        queue.pushBack(1);
        queue.pushBack(2);
        queue.pushBack(3);
        queue.pushBack(4);

        assert.deepEqual(
          queue.range({ from: 0, to: 1 }),
          [1],
          'a range from 0 to 1 is allowed'
        );

        assert.deepEqual(
          queue.range({ from: 0, to: 4 }),
          [1, 2, 3, 4],
          'a range from 0 to 3 is allowed'
        );

        assert.deepEqual(
          queue.range({ from: 1, to: 3 }),
          [2, 3],
          'an internal range works correctly'
        );

        assert.throws(
          () => queue.range({ from: 1, to: 0 }),
          (error: Error) =>
            error.message ===
            "TrackedQueue: range: 'from' must be less than 'to', but 'from' was 1 and 'to' was 0",
          'a range with `from` > `to` throws'
        );

        assert.throws(
          () => queue.range({ from: 0, to: 5 }),
          (error: Error) =>
            error.message ===
            "TrackedQueue: range: 'to' must be in 1 <= 4, but was 5",
          'a range from 0 to n > capacity throws'
        );
      });
    });

    module(`.includes()`, function () {
      expectTypeOf<TrackedQueue<string>['includes']>().parameters.toEqualTypeOf<
        [string]
      >();

      test('when the queue is empty', function (assert) {
        const queue = new TrackedQueue({ capacity: 10 });
        assert.false(queue.includes('hello'), 'it never includes anything');
      });

      test('when the queue has items', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        queue.pushBack(1);
        queue.pushBack(2);
        assert.true(
          queue.includes(1) && queue.includes(2),
          'it includes items which are in the queue'
        );
        assert.false(queue.includes(3), 'it does not include other items');
      });

      test('when the queue has wrapped', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 3 });
        queue.pushBack(1);
        queue.pushBack(2);
        queue.pushBack(3);
        queue.pushBack(4);
        assert.true(
          queue.includes(2) && queue.includes(3) && queue.includes(4),
          'it includes items which are still in the queue'
        );
        assert.false(
          queue.includes(1),
          'it does not include items pushed from the queue'
        );
        assert.false(queue.includes(1000), 'it does not include other items');
      });

      module('correctly handles `undefined`', function () {
        test('when the queue is empty', function (assert) {
          const queue = new TrackedQueue<number | undefined>({ capacity: 10 });
          assert.false(
            queue.includes(undefined),
            'it does not include `undefined`'
          );
        });

        test('when the queue has items but does not include `undefined`', function (assert) {
          const queue = new TrackedQueue<number | undefined>({ capacity: 10 });
          queue.pushBack(1);
          queue.pushBack(2);
          assert.false(
            queue.includes(undefined),
            'it does not include `undefined`'
          );
        });

        test('when the queue has items and does include `undefined`', function (assert) {
          const queue = new TrackedQueue<number | undefined>({ capacity: 10 });
          queue.pushBack(1);
          queue.pushBack(2);
          queue.pushBack(undefined);
          queue.pushBack(3);
          queue.pushBack(4);
          assert.true(
            queue.includes(undefined),
            'it does not include `undefined`'
          );
        });
      });
    });

    module('`.clear()', function () {
      test('when the queue is empty', function (assert) {
        const queue = new TrackedQueue({ capacity: 10 });
        queue.clear();
        assert.equal(
          queue.size,
          0,
          'after calling `.clear()`, the size is still 0'
        );
        assert.equal(queue.front, undefined, '`.front` is `undefined');
        assert.equal(queue.back, undefined, '`.back` is `undefined');
      });

      test('when the queue has items', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        queue.pushBack(1);
        queue.pushBack(2);
        queue.pushBack(3);
        queue.pushBack(4);
        queue.pushBack(5);
        queue.clear();
        assert.equal(
          queue.size,
          0,
          'after calling `.clear()`, the size is `0` again'
        );
        assert.equal(queue.front, undefined, '`.front` is `undefined');
        assert.equal(queue.back, undefined, '`.back` is `undefined');
      });

      test('when the queue has wrapped', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 4 });
        queue.pushBack(1);
        queue.pushBack(2);
        queue.pushBack(3);
        queue.pushBack(4);
        queue.pushBack(5);
        queue.clear();
        assert.equal(
          queue.size,
          0,
          'after calling `.clear()`, the size is `0` again'
        );
        assert.equal(queue.front, undefined, '`.front` is `undefined');
        assert.equal(queue.back, undefined, '`.back` is `undefined');
      });
    });

    module('.isEmpty', function () {
      test('when the queue is empty', function (assert) {
        const queue = new TrackedQueue<string>({ capacity: 10 });
        assert.true(queue.isEmpty, '`.isEmpty` is `true');
      });

      test('when the queue has items', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        queue.pushBack(1);
        queue.pushBack(2);
        assert.false(queue.isEmpty, '`.isEmpty` is `false`');
      });

      test('when the queue has wrapped', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 3 });
        queue.pushBack(1);
        queue.pushBack(2);
        queue.pushBack(3);
        queue.pushBack(4);
        assert.false(queue.isEmpty, '`.isEmpty` is `false`');
      });

      test('narrowing works', function (assert) {
        const queue = new TrackedQueue<string>({ capacity: 10 });
        if (queue.isEmpty) {
          expectTypeOf(queue.front).toEqualTypeOf<undefined>();
          expectTypeOf(queue.back).toEqualTypeOf<undefined>();
          expectTypeOf(queue.size).toEqualTypeOf<0>();
        } else {
          expectTypeOf(queue.front).toEqualTypeOf<string>();
          expectTypeOf(queue.back).toEqualTypeOf<string>();
        }
        assert.ok(true, 'type checking yay');
      });
    });

    module('`.append()`', function () {
      expectTypeOf<TrackedQueue<string>['append']>().parameters.toEqualTypeOf<
        [Array<string>]
      >();

      test('when the queue is empty', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        const source = [1, 2, 3];
        const popped = queue.append(source);
        assert.equal(
          queue.size,
          source.length,
          'pushing an array with fewer items than the capacity produces a queue of equal size'
        );
        assert.deepEqual(popped, [], 'no items are popped');
      });

      test('when the queue has items', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        queue.pushBack(1);
        queue.pushBack(2);
        const originalSize = queue.size;

        const source = [1, 2, 3];
        const popped = queue.append(source);
        assert.equal(
          queue.size,
          source.length + originalSize,
          'pushing an array with fewer items than the capacity produces a queue of combined size'
        );
        assert.deepEqual(
          [...queue],
          [1, 2, ...source],
          'the values in the queue include the originals and those from the source'
        );
        assert.deepEqual(popped, [], 'no items are popped');
      });

      test('when the queue is full', function (assert) {
        const capacity = 3;
        const queue = new TrackedQueue<number>({ capacity });
        queue.pushBack(1);
        queue.pushBack(2);
        queue.pushBack(3);

        const source = [4, 5, 6];
        const popped = queue.append(source);
        assert.equal(
          queue.size,
          capacity,
          'pushing an array produces a queue with a `size` of `capacity`'
        );
        assert.deepEqual(
          [...queue],
          source,
          'the values in the queue are those from the source'
        );
        assert.deepEqual(
          popped,
          [1, 2, 3],
          'the items pushed out of the queue are returned'
        );
      });

      test('when the queue is wrapping', function (assert) {
        const capacity = 3;
        const queue = new TrackedQueue<number>({ capacity });
        queue.pushBack(1);
        queue.pushBack(2);
        queue.pushBack(3);

        const source = [4, 5];
        const popped = queue.append(source);
        assert.equal(
          queue.size,
          capacity,
          'pushing an array with fewer items than the capacity produces a queue of combined size'
        );
        assert.deepEqual(
          [...queue],
          [3, 4, 5],
          'the resulting queue has the correct items'
        );
        assert.deepEqual(
          popped,
          [1, 2],
          'the items pushed out of the queue are returned'
        );
      });

      test('when the queue includes undefined values', function (assert) {
        const source = [1, undefined, 2];
        const queue = TrackedQueue.of(source);
        const popped = queue.append([4, 5, 6]);
        assert.deepEqual(
          popped,
          source,
          'the popped values includes `undefined`'
        );
      });
    });

    module('`.prepend()`', function () {
      expectTypeOf<TrackedQueue<string>['prepend']>().parameters.toEqualTypeOf<
        [Array<string>]
      >();

      test('when the queue is empty', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        const source = [1, 2, 3];
        const popped = queue.prepend(source);
        assert.equal(
          queue.size,
          source.length,
          'pushing an array with fewer items than the capacity produces a queue of equal size'
        );
        assert.deepEqual(popped, [], 'no items are popped');
      });

      test('when the queue has items', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        queue.pushBack(1);
        queue.pushBack(2); // [1, 2, _, _, _, _, _, _, _, _]
        const originalSize = queue.size;

        const source = [1, 2, 3];
        const popped = queue.prepend(source); // [1, 2, _, _, _, _, _, 1, 2, 3]
        assert.equal(
          queue.size,
          source.length + originalSize,
          'pushing an array with fewer items than the capacity produces a queue of combined size'
        );
        assert.deepEqual(
          [...queue],
          [...source, 1, 2],
          'the values in the queue include the originals and those from the source'
        );
        assert.deepEqual(popped, [], 'no items are popped');
      });

      test('when the queue is full', function (assert) {
        const capacity = 3;
        const queue = new TrackedQueue<number>({ capacity });
        queue.pushBack(1);
        queue.pushBack(2);
        queue.pushBack(3); // (1, 2, 3, _)

        const source = [4, 5, 6];
        const popped = queue.prepend(source); // (_, 4, 5, 6)
        assert.equal(
          queue.size,
          capacity,
          'pushing an array produces a queue with a `size` of `capacity`'
        );
        assert.deepEqual(
          [...queue],
          source,
          'the values in the queue are those from the source'
        );
        assert.deepEqual(
          popped,
          [1, 2, 3],
          'the items pushed out of the queue are returned'
        );
      });

      test('when the queue is wrapping', function (assert) {
        const capacity = 3;
        const queue = new TrackedQueue<string>({ capacity });
        queue.pushBack('a');
        queue.pushBack('b');
        queue.pushBack('c');
        queue.pushBack('d'); // (_, b, c, d)

        const source = ['x', 'y'];
        const popped = queue.prepend(source); // (y, b, _, x)
        assert.equal(
          queue.size,
          capacity,
          'pushing an array with fewer items than the capacity produces a queue of combined size'
        );
        assert.deepEqual(
          [...queue],
          ['x', 'y', 'b'],
          'the resulting queue has the correct items'
        );
        assert.deepEqual(
          popped,
          ['c', 'd'],
          'the items pushed out of the queue are returned'
        );
      });

      test('when the queue includes undefined values', function (assert) {
        const source = [1, undefined, 2];
        const queue = TrackedQueue.of(source);
        const popped = queue.prepend([4, 5, 6]);
        assert.deepEqual(
          popped,
          source,
          'the popped values includes `undefined`'
        );
      });
    });

    module('`.toString()`', function () {
      expectTypeOf<TrackedQueue<unknown>['toString']>().toEqualTypeOf<
        () => string
      >();

      test('when the queue is empty', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        assert.equal(
          queue.toString(),
          'TrackedQueue()',
          'it shows an empty queue'
        );
      });

      test('when the queue has one item', function (assert) {
        const queue = TrackedQueue.of([1]);
        assert.equal(
          queue.toString(),
          'TrackedQueue(1)',
          'it shows the single item'
        );
      });

      test('when the queue is full', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 10 });
        queue.append([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        assert.equal(
          queue.toString(),
          'TrackedQueue(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)',
          'it shows all the item'
        );
      });

      test('when the queue has wrapped', function (assert) {
        const queue = new TrackedQueue<number>({ capacity: 5 });
        queue.append([1, 2, 3, 4, 5, 6, 7]);
        assert.equal(
          queue.toString(),
          'TrackedQueue(3, 4, 5, 6, 7)',
          'it shows the correct items in the correct order'
        );
      });
    });
  });

  module('rendering', function (hooks) {
    setupRenderingTest(hooks);

    interface TestContext extends BaseContext {
      queue: TrackedQueue<unknown>;
    }

    test('tracks `size`', async function (this: TestContext, assert) {
      this.queue = new TrackedQueue({ capacity: 10 });
      await render(hbs`
        <span data-test-is-emtpy>{{this.queue.size}}</span>
      `);
      assert.dom('[data-test-is-emtpy]').hasText('0');

      this.queue.pushBack('hello');
      await rerender();
      assert.dom('[data-test-is-emtpy]').hasText('1');

      this.queue.popBack();
      await rerender();
      assert.dom('[data-test-is-emtpy]').hasText('0');
    });

    test('tracks `front`', async function (this: TestContext, assert) {
      this.queue = new TrackedQueue({ capacity: 10 });
      await render(hbs`
        <span data-test-front>{{this.queue.front}}</span>
      `);
      assert.dom('[data-test-front]').hasText('');

      const expected = 'hello';
      this.queue.pushBack(expected);
      await rerender();
      assert.dom('[data-test-front]').hasText(expected);

      this.queue.prepend(['a', 'b', 'c']);
      await rerender();
      assert.dom('[data-test-front]').hasText('a');
    });

    test('tracks `back`', async function (this: TestContext, assert) {
      this.queue = new TrackedQueue({ capacity: 10 });
      await render(hbs`
        <span data-test-back>{{this.queue.back}}</span>
      `);
      assert.dom('[data-test-back]').hasText('');

      const expected = 'hello';
      this.queue.pushBack(expected);
      await rerender();
      assert.dom('[data-test-back]').hasText(expected);

      this.queue.prepend(['a', 'b', 'c']);
      await rerender();
      assert.dom('[data-test-back]').hasText(expected);
    });

    test('tracks `isEmpty`', async function (this: TestContext, assert) {
      this.queue = new TrackedQueue({ capacity: 10 });
      await render(hbs`
        <span data-test-is-emtpy>{{this.queue.isEmpty}}</span>
      `);
      assert.dom('[data-test-is-emtpy]').hasText('true');

      this.queue.pushBack(123);
      await rerender();
      assert.dom('[data-test-is-emtpy]').hasText('false');

      this.queue.popBack();
      await rerender();
      assert.dom('[data-test-is-emtpy]').hasText('true');
    });

    test('tracks values derived via `at`', async function (this: TestContext, assert) {
      this.queue = new TrackedQueue({ capacity: 10 });

      class Dummy extends Component<{ queue: TrackedQueue<unknown> }> {
        get fifth() {
          return this.args.queue.at(4);
        }
      }
      setComponentTemplate(
        hbs`<div data-test-dummy>{{this.fifth}}</div>`,
        Dummy
      );
      this.owner.register('component:dummy', Dummy);

      await render(hbs`
        <Dummy @queue={{this.queue}} />
      `);

      assert.dom('[data-test-dummy]').hasNoText();

      this.queue.append([1, 2, 3, 4, 5]);
      await rerender();
      assert.dom('[data-test-dummy]').hasText('5');
    });

    test('tracks values derived via `range`', async function (this: TestContext, assert) {
      this.queue = new TrackedQueue({ capacity: 10 });

      class Dummy extends Component<{ queue: TrackedQueue<unknown> }> {
        get items() {
          return this.args.queue.isEmpty
            ? []
            : this.args.queue.range({ from: 2, to: 7 });
        }
      }
      setComponentTemplate(
        hbs`
          <ul data-test-list>
            {{#each this.items as |item index|}}
              <li data-test-item={{index}}>{{item}}</li>
            {{/each}}
          </ul>
        `,
        Dummy
      );
      this.owner.register('component:dummy', Dummy);

      await render(hbs`
        <Dummy @queue={{this.queue}} />
      `);

      assert.dom('[data-test-list]').hasNoText();

      this.queue.append([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      await rerender();
      assert.dom('[data-test-item="0"]').hasText('3');
      assert.dom('[data-test-item="1"]').hasText('4');
      assert.dom('[data-test-item="2"]').hasText('5');
      assert.dom('[data-test-item="3"]').hasText('6');
      assert.dom('[data-test-item="4"]').hasText('7');

      this.queue.append([11, 12, 13, 14, 15]);
      await rerender();
      assert.dom('[data-test-item="0"]').hasText('8');
      assert.dom('[data-test-item="1"]').hasText('9');
      assert.dom('[data-test-item="2"]').hasText('10');
      assert.dom('[data-test-item="3"]').hasText('11');
      assert.dom('[data-test-item="4"]').hasText('12');
    });

    test('tracks result of using `includes`', async function (this: TestContext, assert) {
      this.queue = new TrackedQueue({ capacity: 10 });

      class Dummy extends Component<{ queue: TrackedQueue<unknown> }> {
        get hasSeven() {
          return this.args.queue.includes(7);
        }
      }
      setComponentTemplate(
        hbs`<div data-test-dummy>{{this.hasSeven}}</div>`,
        Dummy
      );
      this.owner.register('component:dummy', Dummy);

      await render(hbs`
        <Dummy @queue={{this.queue}} />
      `);

      assert.dom('[data-test-dummy]').hasText('false');

      this.queue.pushBack(7);
      await rerender();
      assert.dom('[data-test-dummy]').hasText('true');
    });

    test('tracks iteration', async function (this: TestContext, assert) {
      this.queue = new TrackedQueue({ capacity: 10 });
      this.queue.append([1, 2, 3, 4, 5]);

      await render(hbs`
        <ul data-test-list>
          {{#each this.queue as |item index|}}
            <li data-test-item={{index}}>{{item}}</li>
          {{/each}}
        </ul>
      `);

      assert.dom('[data-test-item="0"]').hasText('1');
      assert.dom('[data-test-item="1"]').hasText('2');
      assert.dom('[data-test-item="2"]').hasText('3');
      assert.dom('[data-test-item="3"]').hasText('4');
      assert.dom('[data-test-item="4"]').hasText('5');
      assert.dom('[data-test-item="5"]').doesNotExist();

      this.queue.pushBack(6);
      await rerender();
      assert.dom('[data-test-item="0"]').hasText('1');
      assert.dom('[data-test-item="1"]').hasText('2');
      assert.dom('[data-test-item="2"]').hasText('3');
      assert.dom('[data-test-item="3"]').hasText('4');
      assert.dom('[data-test-item="4"]').hasText('5');
      assert.dom('[data-test-item="5"]').hasText('6');
    });

    test('tracks result of using `map`', async function (this: TestContext, assert) {
      this.queue = new TrackedQueue({ capacity: 10 });

      class Dummy extends Component<{ queue: TrackedQueue<number> }> {
        get doubled() {
          return this.args.queue.map((n) => n * 2);
        }
      }
      setComponentTemplate(
        hbs`
          <ul data-test-list>
            {{#each this.doubled as |item index|}}
              <li data-test-item={{index}}>{{item}}</li>
            {{/each}}
          </ul>
        `,
        Dummy
      );
      this.owner.register('component:dummy', Dummy);

      await render(hbs`
        <Dummy @queue={{this.queue}} />
      `);

      assert.dom('[data-test-list]').hasNoText();

      this.queue.append([1, 2, 3, 4, 5]);
      await rerender();
      assert.dom('[data-test-item="0"]').hasText('2');
      assert.dom('[data-test-item="1"]').hasText('4');
      assert.dom('[data-test-item="2"]').hasText('6');
      assert.dom('[data-test-item="3"]').hasText('8');
      assert.dom('[data-test-item="4"]').hasText('10');
    });

    test('tracks results of `clear`', async function (this: TestContext, assert) {
      this.queue = new TrackedQueue({ capacity: 4 });
      this.queue.append([1, 2, 3, 4, 5]);

      await render(hbs`
        <ul data-test-list>
          {{#each this.queue as |item index|}}
            <li data-test-item={{index}}>{{item}}</li>
          {{/each}}
        </ul>
      `);

      this.queue.clear();
      await rerender();
      assert.dom('[data-test-list]').hasNoText();

      this.queue.append([1, 2, 3, 4, 5]);
      await rerender();
      assert.dom('[data-test-item="0"]').hasText('2');
      assert.dom('[data-test-item="1"]').hasText('3');
      assert.dom('[data-test-item="2"]').hasText('4');
      assert.dom('[data-test-item="3"]').hasText('5');
      assert.dom('[data-test-item="4"]').doesNotExist();
    });
  });
});
