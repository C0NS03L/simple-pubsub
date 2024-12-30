import {
  PubSubService,
  MachineSaleEvent,
  MachineRefillEvent,
  MachineSaleSubscriber,
  MachineRefillSubscriber,
  StockWarningSubscriber,
  StockOKSubscriber,
  Machine,
  MachineEventType,
} from "./app";

describe("PubSubService", () => {
  let pubSubService: PubSubService;
  let machines: Machine[];
  let saleSubscriber: MachineSaleSubscriber;
  let refillSubscriber: MachineRefillSubscriber;
  let stockWarningSubscriber: StockWarningSubscriber;
  let stockOKSubscriber: StockOKSubscriber;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    pubSubService = PubSubService.getInstance();
    pubSubService["subscribers"].clear();
    machines = [new Machine("001"), new Machine("002"), new Machine("003")];
    saleSubscriber = new MachineSaleSubscriber(machines);
    refillSubscriber = new MachineRefillSubscriber(machines);
    stockWarningSubscriber = new StockWarningSubscriber(machines);
    stockOKSubscriber = new StockOKSubscriber(machines);
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test("Sub and Pub Sale", () => {
    pubSubService.subscribe(MachineEventType.SALE, saleSubscriber);
    const saleEvent = new MachineSaleEvent(2, "001");
    pubSubService.publish(saleEvent);

    expect(machines[0].stockLevel).toBe(8);
  });

  test("Sub and Pub Refill", () => {
    pubSubService.subscribe(MachineEventType.REFILL, refillSubscriber);
    const refillEvent = new MachineRefillEvent(3, "002");
    pubSubService.publish(refillEvent);

    expect(machines[1].stockLevel).toBe(13);
  });

  test("Sale Event Unsubscribe", () => {
    pubSubService.subscribe(MachineEventType.SALE, saleSubscriber);
    pubSubService.unsubscribe(MachineEventType.SALE, saleSubscriber);
    const saleEvent = new MachineSaleEvent(2, "001");
    pubSubService.publish(saleEvent);

    expect(machines[0].stockLevel).toBe(10);
  });

  test("Refill Event Unsubscribe", () => {
    pubSubService.subscribe(MachineEventType.REFILL, refillSubscriber);
    pubSubService.unsubscribe(MachineEventType.REFILL, refillSubscriber);
    const refillEvent = new MachineRefillEvent(3, "002");
    pubSubService.publish(refillEvent);

    expect(machines[1].stockLevel).toBe(10);
  });

  test("Multiple Events", () => {
    pubSubService.subscribe(MachineEventType.SALE, saleSubscriber);
    pubSubService.subscribe(MachineEventType.REFILL, refillSubscriber);

    const events = [
      new MachineSaleEvent(1, "001"),
      new MachineRefillEvent(5, "001"),
      new MachineSaleEvent(2, "002"),
      new MachineRefillEvent(3, "003"),
    ];

    events.map(pubSubService.publish);

    expect(machines[0].stockLevel).toBe(14);
    expect(machines[1].stockLevel).toBe(8);
    expect(machines[2].stockLevel).toBe(13);
  });

  test("SubUnSub Events", () => {
    pubSubService.subscribe(MachineEventType.SALE, saleSubscriber);
    pubSubService.subscribe(MachineEventType.REFILL, refillSubscriber);

    const events = [
      new MachineSaleEvent(1, "001"),
      new MachineRefillEvent(5, "001"),
      new MachineSaleEvent(2, "002"),
      new MachineRefillEvent(3, "003"),
    ];

    events.map(pubSubService.publish);

    pubSubService.unsubscribe(MachineEventType.SALE, saleSubscriber);
    pubSubService.unsubscribe(MachineEventType.REFILL, refillSubscriber);

    const events2 = [
      new MachineSaleEvent(1, "001"),
      new MachineRefillEvent(5, "001"),
      new MachineSaleEvent(2, "002"),
      new MachineRefillEvent(3, "003"),
    ];

    events2.map(pubSubService.publish);

    expect(machines[0].stockLevel).toBe(14);
    expect(machines[1].stockLevel).toBe(8);
    expect(machines[2].stockLevel).toBe(13);
  });

  test("Low Stock Warning Event", () => {
    pubSubService.subscribe(MachineEventType.SALE, saleSubscriber);
    pubSubService.subscribe(MachineEventType.LOW_STOCK, stockWarningSubscriber);
    const saleEvent = new MachineSaleEvent(8, "001");
    pubSubService.publish(saleEvent);
    expect(machines[0].stockLevel).toBe(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Low stock warning for machine 001"
    );
  });

  test("Stock OK Event", () => {
    pubSubService.subscribe(MachineEventType.REFILL, refillSubscriber);
    pubSubService.subscribe(MachineEventType.STOCK_OK, stockOKSubscriber);

    machines[0].stockLevel = 2; // Set initial stock level below threshold
    const refillEvent = new MachineRefillEvent(3, "001");
    pubSubService.publish(refillEvent);

    expect(machines[0].stockLevel).toBe(5);
    expect(consoleSpy).toHaveBeenCalledWith("Stock OK for machine 001");
  });

  test("Stock OK Threshold", () => {
    pubSubService.subscribe(MachineEventType.SALE, saleSubscriber);
    pubSubService.subscribe(MachineEventType.REFILL, refillSubscriber);
    pubSubService.subscribe(MachineEventType.LOW_STOCK, stockWarningSubscriber);
    pubSubService.subscribe(MachineEventType.STOCK_OK, stockOKSubscriber);

    machines[0].stockLevel = 5; // Set initial stock level at threshold
    const refillEvent = new MachineRefillEvent(5, "001");
    pubSubService.publish(refillEvent);

    expect(consoleSpy).not.toHaveBeenCalledWith("Stock OK for machine 001");
    expect(machines[0].stockLevel).toBe(10);

    const saleEvent = new MachineSaleEvent(8, "001");
    pubSubService.publish(saleEvent);

    expect(machines[0].stockLevel).toBe(2);

    const refillEvent2 = new MachineRefillEvent(3, "001");
    pubSubService.publish(refillEvent2);

    expect(machines[0].stockLevel).toBe(5);
    expect(consoleSpy).toHaveBeenCalledWith("Stock OK for machine 001");
  });

  test("Low Stock Warning and Stock OK Events", () => {
    pubSubService.subscribe(MachineEventType.SALE, saleSubscriber);
    pubSubService.subscribe(MachineEventType.REFILL, refillSubscriber);
    pubSubService.subscribe(MachineEventType.LOW_STOCK, stockWarningSubscriber);
    pubSubService.subscribe(MachineEventType.STOCK_OK, stockOKSubscriber);

    const saleEvent = new MachineSaleEvent(8, "001");
    pubSubService.publish(saleEvent);
    expect(machines[0].stockLevel).toBe(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Low stock warning for machine 001"
    );

    const refillEvent = new MachineRefillEvent(3, "001");
    pubSubService.publish(refillEvent);
    expect(machines[0].stockLevel).toBe(5);
    expect(consoleSpy).toHaveBeenCalledWith("Stock OK for machine 001");
  });

  test("Low Stock Warning and Stock OK Events Unsubscribe", () => {
    pubSubService.subscribe(MachineEventType.SALE, saleSubscriber);
    pubSubService.subscribe(MachineEventType.REFILL, refillSubscriber);
    pubSubService.subscribe(MachineEventType.LOW_STOCK, stockWarningSubscriber);
    pubSubService.subscribe(MachineEventType.STOCK_OK, stockOKSubscriber);

    const saleEvent = new MachineSaleEvent(8, "001");
    pubSubService.publish(saleEvent);
    expect(machines[0].stockLevel).toBe(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Low stock warning for machine 001"
    );
    pubSubService.unsubscribe(
      MachineEventType.LOW_STOCK,
      stockWarningSubscriber
    );
    const refillEvent = new MachineRefillEvent(3, "001");
    pubSubService.publish(refillEvent);
    expect(machines[0].stockLevel).toBe(5);
    expect(consoleSpy).toHaveBeenCalledWith("Stock OK for machine 001");

    consoleSpy.mockRestore();

    const saleEvent2 = new MachineSaleEvent(4, "001");
    pubSubService.publish(saleEvent2);
    expect(machines[0].stockLevel).toBe(1);
    expect(consoleSpy).not.toHaveBeenCalledWith(
      "Low stock warning for machine 001"
    );
  });
});
