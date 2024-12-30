//enum
export enum MachineEventType {
  SALE = "SALE",
  REFILL = "REFILL",
}

// interfaces
interface IEvent {
  type(): MachineEventType;
  machineId(): string;
}

interface ISubscriber {
  handle(event: IEvent): void;
}

interface IPublishSubscribeService {
  publish(event: IEvent): void;
  subscribe(type: MachineEventType, handler: ISubscriber): void;
  unsubscribe(type: MachineEventType, handler: ISubscriber): void;
}

// classes

export class PubSubService implements IPublishSubscribeService {
  private subscribers: Map<MachineEventType, ISubscriber[]> = new Map();

  constructor() {
    this.publish = this.publish.bind(this);
    this.subscribe = this.subscribe.bind(this);
  }

  publish(event: IEvent): void {
    const type = event.type();
    const handlers = this.subscribers.get(type) || [];
    if (handlers) {
      handlers.map((handler) => handler.handle(event));
    }
  }

  subscribe(type: MachineEventType, handler: ISubscriber): void {
    const handlers = this.subscribers.get(type) || [];
    handlers.push(handler);
    this.subscribers.set(type, handlers);
  }

  unsubscribe(type: MachineEventType, handler: ISubscriber): void {
    const handlers = this.subscribers.get(type) || [];
    const newHandlers = handlers.filter((h) => h !== handler);
    this.subscribers.set(type, newHandlers);
  }
}

// implementations
export class MachineSaleEvent implements IEvent {
  constructor(
    private readonly _sold: number,
    private readonly _machineId: string
  ) {}

  machineId(): string {
    return this._machineId;
  }

  getSoldQuantity(): number {
    return this._sold;
  }

  type(): MachineEventType {
    return MachineEventType.SALE;
  }

  updateStock(machines: Machine[]): void {
    const machine = machines.find((m) => m.id === this._machineId);
    if (machine) {
      machine.stockLevel -= this._sold;
    }
  }
}

export class MachineRefillEvent implements IEvent {
  constructor(
    private readonly _refill: number,
    private readonly _machineId: string
  ) {}

  machineId(): string {
    return this._machineId;
  }

  type(): MachineEventType {
    return MachineEventType.REFILL;
  }

  getRefillQuantity(): number {
    return this._refill;
  }

  updateStock(machines: Machine[]): void {
    const machine = machines.find((m) => m.id === this._machineId);
    if (machine) {
      machine.stockLevel += this._refill;
    } else {
      throw new Error(`Machine ${this._machineId} not found`);
    }
  }
}

export class MachineSaleSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor(machines: Machine[]) {
    this.machines = machines;
  }

  handle(event: MachineSaleEvent): void {
    event.updateStock(this.machines);
  }
}

export class MachineRefillSubscriber implements ISubscriber {
  public machines: Machine[];

  constructor(machines: Machine[]) {
    this.machines = machines;
  }

  handle(event: MachineRefillEvent): void {
    event.updateStock(this.machines);
  }
}

// objects
export class Machine {
  public stockLevel = 10;
  public id: string;

  constructor(id: string) {
    this.id = id;
  }
}

// helpers
const randomMachine = (): string => {
  const random = Math.random() * 3;
  if (random < 1) {
    return "001";
  } else if (random < 2) {
    return "002";
  }
  return "003";
};

const eventGenerator = (): IEvent => {
  const random = Math.random();
  if (random < 0.5) {
    const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
    return new MachineSaleEvent(saleQty, randomMachine());
  }
  const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
  return new MachineRefillEvent(refillQty, randomMachine());
};

// program
(async () => {
  // create 3 machines with a quantity of 10 stock
  const machines: Machine[] = [
    new Machine("001"),
    new Machine("002"),
    new Machine("003"),
  ];

  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const saleSubscriber = new MachineSaleSubscriber(machines);

  // create the PubSub service
  const pubSubService: IPublishSubscribeService = new PubSubService();

  // create 5 random events
  const events = [1, 2, 3, 4, 5].map((i) => eventGenerator());

  // publish the events
  events.map(pubSubService.publish);
})();
