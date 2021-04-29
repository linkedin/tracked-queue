import Controller from '@ember/controller';
import TrackedQueue from 'tracked-queue';

const size = 10000;

function someNumber() {
  return Math.round(Math.random() * size);
}

const initialData = Array.from({ length: size }, (_, i) => ({
  body: `message ${i}`,
  random: someNumber(),
}));

export default class ApplicationController extends Controller {
  bigQueue: TrackedQueue<{ body: string; random: number }>;

  get subset() {
    return this.bigQueue.range({ from: 100, to: 200 });
  }

  get tinyWindow() {
    return this.bigQueue.range({ from: 990, to: 1000 });
  }

  get bigWindow() {
    return this.bigQueue.range({ from: 10, to: 4990 });
  }

  get tail() {
    return this.bigQueue.range({
      from: this.bigQueue.size - 10,
      to: this.bigQueue.size,
    });
  }

  get randomValue() {
    return this.bigQueue.at(221);
  }

  shortInterval: number;
  longInterval: number;

  constructor() {
    super();
    this.bigQueue = new TrackedQueue({ capacity: size * 5 });
    for (const v of initialData) {
      this.bigQueue.pushBack(v);
    }

    this.shortInterval = window.setInterval(() => {
      const decider = Math.random();
      const newNumber = someNumber();
      if (decider < 0.2) {
        this.bigQueue.popBack();
      } else if (decider < 0.4) {
        this.bigQueue.pushBack({
          body: `message ${this.bigQueue.size + 1}`,
          random: newNumber,
        });
      } else if (decider < 0.8) {
        this.bigQueue.pushFront({
          body: `message ${this.bigQueue.size + 1}`,
          random: newNumber,
        });
      } else {
        this.bigQueue.popFront();
      }
    }, 100);

    this.longInterval = window.setInterval(() => {
      this.bigQueue.append(
        Array.from({ length: 100 }, () => ({
          body: 'bwahahaha',
          random: someNumber(),
        }))
      );
    }, 5000);
  }
}
