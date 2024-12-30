import {
  PubSubService,
  MachineSaleEvent,
  MachineRefillEvent,
  MachineSaleSubscriber,
  MachineRefillSubscriber,
  Machine,
  MachineEventType,
} from "./app";

describe("PubSubService", () => {
  let pubSubService: PubSubService;
  let machines: Machine[];
  let saleSubscriber: MachineSaleSubscriber;
  let refillSubscriber: MachineRefillSubscriber;

  beforeEach(() => {
    pubSubService = new PubSubService();
    machines = [new Machine("001"), new Machine("002"), new Machine("003")];
    saleSubscriber = new MachineSaleSubscriber(machines);
    refillSubscriber = new MachineRefillSubscriber(machines);
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

  test("SubUnSubEvents", () => {
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
});
