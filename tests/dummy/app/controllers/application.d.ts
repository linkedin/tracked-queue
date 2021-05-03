import Controller from '@ember/controller';
import TrackedQueue from 'tracked-queue';
interface Item {
    body: string;
    random: number;
}
export default class ApplicationController extends Controller {
    bigQueue: TrackedQueue<{
        body: string;
        random: number;
    }>;
    get subset(): Item[];
    get tinyWindow(): Item[];
    get bigWindow(): Item[];
    get tail(): Item[];
    get randomValue(): Item | undefined;
    shortInterval: number;
    longInterval: number;
    constructor();
}
export {};
