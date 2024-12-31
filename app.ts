//Eror Class
export class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockError";
  }
}

//enum
export enum MachineEventType {
  SALE = "SALE",
  REFILL = "REFILL",
  LOW_STOCK = "LOW_STOCK",
  STOCK_OK = "STOCK_OK",
}

//const
const STOCK_THRESHOLD = 3;

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

export interface IMachineRepository {
  findById(id: string): Machine | undefined;
  findAll(): Machine[];
  save(machine: Machine): void;
  update(machine: Machine): void;
  delete(id: string): void;
}

// classes
export class PubSubService implements IPublishSubscribeService {
  private static instance: PubSubService;
  private subscribers: Map<MachineEventType, ISubscriber[]> = new Map();

  private constructor() {
    this.publish = this.publish.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
  }

  public static getInstance(): PubSubService {
    if (!PubSubService.instance) {
      PubSubService.instance = new PubSubService();
    }
    return PubSubService.instance;
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
export class MachineRepository implements IMachineRepository {
  private machines: Map<string, Machine> = new Map();

  findById(id: string): Machine | undefined {
    return this.machines.get(id);
  }

  findAll(): Machine[] {
    return Array.from(this.machines.values());
  }

  save(machine: Machine): void {
    if (this.machines.has(machine.id)) {
      throw new Error(`Machine with id ${machine.id} already exists`);
    }
    this.machines.set(machine.id, machine);
  }

  update(machine: Machine): void {
    if (!this.machines.has(machine.id)) {
      throw new Error(`Machine with id ${machine.id} not found`);
    }
    this.machines.set(machine.id, machine);
  }

  delete(id: string): void {
    if (!this.machines.delete(id)) {
      throw new Error(`Machine with id ${id} not found`);
    }
  }
}

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
      let stockBefore = machine.stockLevel;
      machine.stockLevel -= this._sold;
      try {
        if (machine.stockLevel < 0) {
          throw new StockError("Stock level cannot be negative");
        }
      } catch (error: unknown) {
        if (error instanceof StockError) {
          console.error(error.message);
          console.log("Rolling back stock level");
          machine.stockLevel = stockBefore;
        } else {
          throw error;
        }
      }
      if (machine.stockLevel < STOCK_THRESHOLD) {
        const lowStockEvent = new LowStockWarningEvent(this._machineId);
        PubSubService.getInstance().publish(lowStockEvent);
      }
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
      let stockBefore = machine.stockLevel;
      machine.stockLevel += this._refill;
      if (
        stockBefore < STOCK_THRESHOLD &&
        machine.stockLevel >= STOCK_THRESHOLD
      ) {
        const stockOKEvent = new StockOKEvent(this._machineId);
        PubSubService.getInstance().publish(stockOKEvent);
      }
    }
  }
}

export class LowStockWarningEvent implements IEvent {
  constructor(private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  type(): MachineEventType {
    return MachineEventType.LOW_STOCK;
  }
}

export class StockOKEvent implements IEvent {
  constructor(private readonly _machineId: string) {}

  machineId(): string {
    return this._machineId;
  }

  type(): MachineEventType {
    return MachineEventType.STOCK_OK;
  }
}

export class MachineSaleSubscriber implements ISubscriber {
  constructor(private repository: IMachineRepository) {}

  handle(event: MachineSaleEvent): void {
    const machine = this.repository.findById(event.machineId());
    if (machine) {
      let stockBefore = machine.stockLevel;
      machine.stockLevel -= event.getSoldQuantity();
      try {
        if (machine.stockLevel < 0) {
          throw new StockError("Stock level cannot be negative");
        }
        this.repository.update(machine);
      } catch (error: unknown) {
        if (error instanceof StockError) {
          console.error(error.message);
          console.log("Rolling back stock level");
          machine.stockLevel = stockBefore;
          this.repository.update(machine);
        } else {
          throw error;
        }
      }
      if (machine.stockLevel < STOCK_THRESHOLD) {
        const lowStockEvent = new LowStockWarningEvent(event.machineId());
        PubSubService.getInstance().publish(lowStockEvent);
      }
    }
  }
}

export class MachineRefillSubscriber implements ISubscriber {
  constructor(private repository: IMachineRepository) {}

  handle(event: MachineRefillEvent): void {
    const machine = this.repository.findById(event.machineId());
    if (machine) {
      let stockBefore = machine.stockLevel;
      machine.stockLevel += event.getRefillQuantity();
      this.repository.update(machine);

      if (
        stockBefore < STOCK_THRESHOLD &&
        machine.stockLevel >= STOCK_THRESHOLD
      ) {
        const stockOKEvent = new StockOKEvent(event.machineId());
        PubSubService.getInstance().publish(stockOKEvent);
      }
    }
  }
}

export class StockWarningSubscriber implements ISubscriber {
  constructor(private repository: IMachineRepository) {}

  handle(event: LowStockWarningEvent): void {
    console.log(`Low stock warning for machine ${event.machineId()}`);
  }
}

export class StockOKSubscriber implements ISubscriber {
  constructor(private repository: IMachineRepository) {}

  handle(event: StockOKEvent): void {
    console.log(`Stock OK for machine ${event.machineId()}`);
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

  const machineRepository = new MachineRepository();

  // save the machines
  machineRepository.save(new Machine("001"));
  machineRepository.save(new Machine("002"));
  machineRepository.save(new Machine("003"));

  // create a machine sale event subscriber. inject the machines (all subscribers should do this)
  const saleSubscriber = new MachineSaleSubscriber(machineRepository);

  // create the PubSub service
  const pubSubService: IPublishSubscribeService = PubSubService.getInstance();

  // create 5 random events
  const events = [1, 2, 3, 4, 5].map((i) => eventGenerator());

  // publish the events
  events.map(pubSubService.publish);
})();
