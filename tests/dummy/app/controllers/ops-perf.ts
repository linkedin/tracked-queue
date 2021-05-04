import Controller from '@ember/controller';
import { assert } from '@ember/debug';
import { tracked } from '@glimmer/tracking';
import TrackedQueue from 'tracked-queue';

const DEFAULT_CAP = 1_000;

export default class OpsPerfController extends Controller {
  @tracked capacity = DEFAULT_CAP;
  @tracked queue = new TrackedQueue<number>({ capacity: DEFAULT_CAP });
  @tracked buffer = Array.from<number>({ length: DEFAULT_CAP });

  @tracked count = 1000;
  @tracked measuring = false;
  @tracked result: string | null = null;

  get bufferFirst(): number | undefined {
    return this.buffer[0];
  }

  get bufferLast(): number | undefined {
    return this.buffer[this.buffer.length - 1];
  }

  setOpCount = (event: Event): void => {
    event.preventDefault();
    assert(
      'must wire up `setOpCount` on a form element',
      event.target instanceof HTMLFormElement
    );

    const input = event.target.elements.namedItem('op-count');
    assert(
      'must wire up `setCount` on an input[type=number]',
      input instanceof HTMLInputElement && input.type === 'number'
    );

    this.count = input.valueAsNumber;
  };

  setQueueSize = (event: Event): void => {
    event.preventDefault();
    assert(
      'must wire up `setQueueSize` on a form element',
      event.target instanceof HTMLFormElement
    );

    const input = event.target.elements.namedItem('queue-size');
    assert(
      'must wire up `setCount` on an input[type=number]',
      input instanceof HTMLInputElement && input.type === 'number'
    );

    const newCapacity = input.valueAsNumber;
    this.capacity = newCapacity;
    this.queue = new TrackedQueue({ capacity: newCapacity });
    this.buffer = Array.from({ length: newCapacity });
  };

  measurePushBack = (): void => {
    this.prep();
    performance.mark('queue-pushBack-start');
    const { count } = this;
    for (let i = 0; i < count; i++) {
      this.queue.pushBack(i);
    }
    performance.mark('queue-pushBack-end');

    performance.mark('buffer-push-start');
    for (let i = 0; i < count; i++) {
      this.buffer.push(i);
    }
    performance.mark('buffer-push-end');

    performance.measure(
      'pushBack',
      'queue-pushBack-start',
      'queue-pushBack-end'
    );
    performance.measure('push', 'buffer-push-start', 'buffer-push-end');

    this.finalize();
  };

  measurePushFront = (): void => {
    this.prep();
    performance.mark('queue-pushFront-start');
    const { count } = this;
    for (let i = 0; i < count; i++) {
      this.queue.pushFront(i);
    }
    performance.mark('queue-pushFront-end');

    performance.mark('buffer-unshift-start');
    for (let i = 0; i < count; i++) {
      this.buffer.unshift(i);
    }
    performance.mark('buffer-unshift-end');

    performance.measure(
      'pushFront',
      'queue-pushFront-start',
      'queue-pushFront-end'
    );
    performance.measure(
      'unshift',
      'buffer-unshift-start',
      'buffer-unshift-end'
    );

    this.finalize();
  };

  measurePopBack = (): void => {
    this.prep();
    this.result = null;
    const { count } = this;
    for (let i = 0; i < count; i++) {
      this.queue.pushFront(i);
      this.buffer.push(i);
    }

    performance.mark('queue-popBack-start');
    for (let i = 0; i < count; i++) {
      this.queue.popBack();
    }
    performance.mark('queue-popBack-end');

    performance.mark('buffer-pop-start');
    for (let i = 0; i < count; i++) {
      this.buffer.pop();
    }
    performance.mark('buffer-pop-end');

    performance.measure('popBack', 'queue-popBack-start', 'queue-popBack-end');
    performance.measure('pop', 'buffer-pop-start', 'buffer-pop-end');

    this.finalize();
  };

  measurePopFront = (): void => {
    this.prep();
    const { count } = this;
    for (let i = 0; i < count; i++) {
      this.queue.pushFront(i);
      this.buffer.push(i);
    }

    performance.mark('queue-popFront-start');
    for (let i = 0; i < count; i++) {
      this.queue.popFront();
    }
    performance.mark('queue-popFront-end');

    performance.mark('buffer-shift-start');
    for (let i = 0; i < count; i++) {
      this.buffer.shift();
    }
    performance.mark('buffer-shift-end');

    performance.measure(
      'popFront',
      'queue-popFront-start',
      'queue-popFront-end'
    );
    performance.measure('shift', 'buffer-shift-start', 'buffer-shift-end');

    this.finalize();
  };

  prep = (): void => {
    this.result = null;
    this.measuring = true;
    this.queue.clear();
    this.buffer.splice(0);
  };

  finalize = (): void => {
    this.result = performance
      .getEntriesByType('measure')
      .map(({ name, duration }) => `${name}: ${duration}`)
      .join('\n');

    // We need to tell the rendering system that the buffer has been updated so
    // it can correctly re-render.
    // eslint-disable-next-line
    this.buffer = this.buffer;
    this.measuring = false;
    performance.clearMarks();
    performance.clearMeasures();
  };
}
