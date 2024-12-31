/**
 * Custom error class for stock-related errors.
 */
export class StockError extends Error {
  /**
   * Constructs a new StockError instance.
   * @param message - The error message.
   */
  constructor(message: string) {
    super(message);
    this.name = "StockError";
  }
}

/**
 * Enum representing different types of machine events.
 */
export enum MachineEventType {
  SALE = "SALE",
  REFILL = "REFILL",
  LOW_STOCK = "LOW_STOCK",
  STOCK_OK = "STOCK_OK",
}

/**
 * Threshold for low stock level.
 */
const STOCK_THRESHOLD = 3;

/**
 * Interface representing an event.
 */
interface IEvent {
  /**
   * Gets the type of the event.
   * @returns The event type.
   */
  type(): MachineEventType;

  /**
   * Gets the ID of the machine associated with the event.
   * @returns The machine ID.
   */
  machineId(): string;
}

/**
 * Interface representing a subscriber that handles events.
 */
interface ISubscriber {
  /**
   * Handles the given event.
   * @param event - The event to handle.
   */
  handle(event: IEvent): void;
}

/**
 * Interface for a publish-subscribe service.
 */
interface IPublishSubscribeService {
  /**
   * Publishes an event to all subscribers.
   * @param event - The event to publish.
   */
  publish(event: IEvent): void;

  /**
   * Subscribes a handler to a specific event type.
   * @param type - The event type to subscribe to.
   * @param handler - The handler to subscribe.
   */
  subscribe(type: MachineEventType, handler: ISubscriber): void;

  /**
   * Unsubscribes a handler from a specific event type.
   * @param type - The event type to unsubscribe from.
   * @param handler - The handler to unsubscribe.
   */
  unsubscribe(type: MachineEventType, handler: ISubscriber): void;
}

/**
 * Interface for a machine repository.
 */
export interface IMachineRepository {
  /**
   * Finds a machine by its ID.
   * @param id - The ID of the machine.
   * @returns The machine, or undefined if not found.
   */
  findById(id: string): Machine | undefined;

  /**
   * Finds all machines.
   * @returns An array of all machines.
   */
  findAll(): Machine[];

  /**
   * Saves a new machine.
   * @param machine - The machine to save.
   */
  save(machine: Machine): void;

  /**
   * Updates an existing machine.
   * @param machine - The machine to update.
   */
  update(machine: Machine): void;

  /**
   * Deletes a machine by its ID.
   * @param id - The ID of the machine to delete.
   */
  delete(id: string): void;
}

/**
 * Publish-subscribe service implementation.
 */
export class PubSubService implements IPublishSubscribeService {
  private static instance: PubSubService;
  private subscribers: Map<MachineEventType, ISubscriber[]> = new Map();

  private constructor() {
    this.publish = this.publish.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
  }

  /**
   * Gets the singleton instance of the PubSubService.
   * @returns The singleton instance.
   */
  public static getInstance(): PubSubService {
    if (!PubSubService.instance) {
      PubSubService.instance = new PubSubService();
    }
    return PubSubService.instance;
  }

  /**
   * Publishes an event to all subscribers.
   * @param event - The event to publish.
   */
  publish(event: IEvent): void {
    const type = event.type();
    const handlers = this.subscribers.get(type) || [];
    if (handlers) {
      handlers.map((handler) => handler.handle(event));
    }
  }

  /**
   * Subscribes a handler to a specific event type.
   * @param type - The event type to subscribe to.
   * @param handler - The handler to subscribe.
   */
  subscribe(type: MachineEventType, handler: ISubscriber): void {
    const handlers = this.subscribers.get(type) || [];
    handlers.push(handler);
    this.subscribers.set(type, handlers);
  }

  /**
   * Unsubscribes a handler from a specific event type.
   * @param type - The event type to unsubscribe from.
   * @param handler - The handler to unsubscribe.
   */
  unsubscribe(type: MachineEventType, handler: ISubscriber): void {
    const handlers = this.subscribers.get(type) || [];
    const newHandlers = handlers.filter((h) => h !== handler);
    this.subscribers.set(type, newHandlers);
  }
}

/**
 * Machine repository implementation.
 */
export class MachineRepository implements IMachineRepository {
  private machines: Map<string, Machine> = new Map();

  /**
   * Finds a machine by its ID.
   * @param id - The ID of the machine.
   * @returns The machine, or undefined if not found.
   */
  findById(id: string): Machine | undefined {
    return this.machines.get(id);
  }

  /**
   * Finds all machines.
   * @returns An array of all machines.
   */
  findAll(): Machine[] {
    return Array.from(this.machines.values());
  }

  /**
   * Saves a new machine.
   * @param machine - The machine to save.
   */
  save(machine: Machine): void {
    if (this.machines.has(machine.id)) {
      throw new Error(`Machine with id ${machine.id} already exists`);
    }
    this.machines.set(machine.id, machine);
  }

  /**
   * Updates an existing machine.
   * @param machine - The machine to update.
   */
  update(machine: Machine): void {
    if (!this.machines.has(machine.id)) {
      throw new Error(`Machine with id ${machine.id} not found`);
    }
    this.machines.set(machine.id, machine);
  }

  /**
   * Deletes a machine by its ID.
   * @param id - The ID of the machine to delete.
   */
  delete(id: string): void {
    if (!this.machines.delete(id)) {
      throw new Error(`Machine with id ${id} not found`);
    }
  }
}

/**
 * Event representing a machine sale.
 */
export class MachineSaleEvent implements IEvent {
  /**
   * Constructs a new MachineSaleEvent instance.
   * @param _sold - The quantity sold.
   * @param _machineId - The ID of the machine.
   */
  constructor(
    private readonly _sold: number,
    private readonly _machineId: string
  ) {}

  /**
   * Gets the ID of the machine associated with the event.
   * @returns The machine ID.
   */
  machineId(): string {
    return this._machineId;
  }

  /**
   * Gets the quantity sold.
   * @returns The quantity sold.
   */
  getSoldQuantity(): number {
    return this._sold;
  }

  /**
   * Gets the type of the event.
   * @returns The event type.
   */
  type(): MachineEventType {
    return MachineEventType.SALE;
  }

  /**
   * Updates the stock level of the machine.
   * @param machines - The list of machines.
   */
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

/**
 * Event representing a machine refill.
 */
export class MachineRefillEvent implements IEvent {
  /**
   * Constructs a new MachineRefillEvent instance.
   * @param _refill - The quantity refilled.
   * @param _machineId - The ID of the machine.
   */
  constructor(
    private readonly _refill: number,
    private readonly _machineId: string
  ) {}

  /**
   * Gets the ID of the machine associated with the event.
   * @returns The machine ID.
   */
  machineId(): string {
    return this._machineId;
  }

  /**
   * Gets the type of the event.
   * @returns The event type.
   */
  type(): MachineEventType {
    return MachineEventType.REFILL;
  }

  /**
   * Gets the quantity refilled.
   * @returns The quantity refilled.
   */
  getRefillQuantity(): number {
    return this._refill;
  }

  /**
   * Updates the stock level of the machine.
   * @param machines - The list of machines.
   */
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

/**
 * Event representing a low stock warning.
 */
export class LowStockWarningEvent implements IEvent {
  /**
   * Constructs a new LowStockWarningEvent instance.
   * @param _machineId - The ID of the machine.
   */
  constructor(private readonly _machineId: string) {}

  /**
   * Gets the ID of the machine associated with the event.
   * @returns The machine ID.
   */
  machineId(): string {
    return this._machineId;
  }

  /**
   * Gets the type of the event.
   * @returns The event type.
   */
  type(): MachineEventType {
    return MachineEventType.LOW_STOCK;
  }
}

/**
 * Event representing a stock OK notification.
 */
export class StockOKEvent implements IEvent {
  /**
   * Constructs a new StockOKEvent instance.
   * @param _machineId - The ID of the machine.
   */
  constructor(private readonly _machineId: string) {}

  /**
   * Gets the ID of the machine associated with the event.
   * @returns The machine ID.
   */
  machineId(): string {
    return this._machineId;
  }

  /**
   * Gets the type of the event.
   * @returns The event type.
   */
  type(): MachineEventType {
    return MachineEventType.STOCK_OK;
  }
}

/**
 * Subscriber for machine sale events.
 */
export class MachineSaleSubscriber implements ISubscriber {
  /**
   * Constructs a new MachineSaleSubscriber instance.
   * @param repository - The machine repository.
   */
  constructor(private repository: IMachineRepository) {}

  /**
   * Handles a machine sale event.
   * @param event - The machine sale event.
   */
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

/**
 * Subscriber for machine refill events.
 */
export class MachineRefillSubscriber implements ISubscriber {
  /**
   * Constructs a new MachineRefillSubscriber instance.
   * @param repository - The machine repository.
   */
  constructor(private repository: IMachineRepository) {}

  /**
   * Handles a machine refill event.
   * @param event - The machine refill event.
   */
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

/**
 * Subscriber for low stock warning events.
 */
export class StockWarningSubscriber implements ISubscriber {
  /**
   * Constructs a new StockWarningSubscriber instance.
   * @param repository - The machine repository.
   */
  constructor(private repository: IMachineRepository) {}

  /**
   * Handles a low stock warning event.
   * @param event - The low stock warning event.
   */
  handle(event: LowStockWarningEvent): void {
    console.log(`Low stock warning for machine ${event.machineId()}`);
  }
}

/**
 * Subscriber for stock OK events.
 */
export class StockOKSubscriber implements ISubscriber {
  /**
   * Constructs a new StockOKSubscriber instance.
   * @param repository - The machine repository.
   */
  constructor(private repository: IMachineRepository) {}

  /**
   * Handles a stock OK event.
   * @param event - The stock OK event.
   */
  handle(event: StockOKEvent): void {
    console.log(`Stock OK for machine ${event.machineId()}`);
  }
}

/**
 * Represents a machine with a stock level.
 */
export class Machine {
  public stockLevel = 10;
  public id: string;

  /**
   * Constructs a new Machine instance.
   * @param id - The ID of the machine.
   */
  constructor(id: string) {
    this.id = id;
  }
}

/**
 * Generates a random machine ID.
 * @returns A random machine ID.
 */
const randomMachine = (): string => {
  const random = Math.random() * 3;
  if (random < 1) {
    return "001";
  } else if (random < 2) {
    return "002";
  }
  return "003";
};

/**
 * Generates a random event.
 * @returns A random event.
 */
const eventGenerator = (): IEvent => {
  const random = Math.random();
  if (random < 0.5) {
    const saleQty = Math.random() < 0.5 ? 1 : 2; // 1 or 2
    return new MachineSaleEvent(saleQty, randomMachine());
  }
  const refillQty = Math.random() < 0.5 ? 3 : 5; // 3 or 5
  return new MachineRefillEvent(refillQty, randomMachine());
};

/**
 * Main program execution.
 */
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
